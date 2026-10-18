import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
  PurchasesOffering,
  PurchasesPackage,
} from '../services/purchases';
import { usePremium } from '../context/PremiumContext';
import { setCachedPremiumStatus } from '../services/storage';
import { useToast } from '../components/Toast';
import { trackEvent } from '../services/analytics';
import {
  freeTrialOf,
  trialEligibility,
  reminderLeadLabel,
  trialEndDate,
  formatRenewalDate,
  scheduleTrialEndingReminder,
} from '../services/trial';

export type PlanKey = 'monthly' | 'annual';

export interface ResolvedPackages {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

function resolvePackages(offering: PurchasesOffering | null): ResolvedPackages {
  if (!offering) return { monthly: null, annual: null };
  const monthly =
    offering.monthly ??
    offering.availablePackages.find(
      (p) => p.product.identifier === PRODUCT_IDS.monthly
    ) ??
    null;
  const annual =
    offering.annual ??
    offering.availablePackages.find(
      (p) => p.product.identifier === PRODUCT_IDS.annual
    ) ??
    null;
  return { monthly, annual };
}

/** Web export only (store screenshots): the real offer shape without StoreKit. */
const WEB_DEMO = Platform.OS === 'web';
const DEMO_PRICES = { monthly: '$0.99', annual: '$9.99' };

/**
 * State and actions for the one SayBright paywall (refresh 1.3.0). `onDone`
 * runs after a purchase or restore, or when the person closes it; the /paywall
 * route goes back, the onboarding step finishes onboarding.
 */
export function usePaywallController(source: string, onDone?: () => void) {
  const variant = 'refresh';
  const router = useRouter();
  const { refreshPremiumStatus, setPremiumOptimistic } = usePremium();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [packages, setPackages] = useState<ResolvedPackages>({
    monthly: null,
    annual: null,
  });
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [eligible, setEligible] = useState<Record<string, boolean>>({});
  /** Inline message under the button; the guard bans Alert.alert in screens. */
  const [notice, setNotice] = useState<string | null>(null);

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setError(false);
    if (WEB_DEMO) {
      setLoading(false);
      return;
    }
    const offering = await getOfferings();
    const resolved = resolvePackages(offering);
    if (!resolved.monthly && !resolved.annual) {
      // In dev the paywall still renders with the fallback prices below, so the
      // layout can be reviewed and screenshotted without live offerings. Buying
      // is still blocked in handlePurchase. Production shows the error state.
      if (__DEV__) {
        console.warn(
          '[Paywall] No packages resolved. Rendering fallback prices because __DEV__ is set. This would show the error state in production.'
        );
      } else {
        setError(true);
      }
    } else {
      // Check trial eligibility for both plans before the paywall shows, so
      // the button never flips and a fast tap still gets the reminder.
      const ids = [resolved.monthly, resolved.annual]
        .filter((p): p is PurchasesPackage => !!p && !!freeTrialOf(p.product))
        .map((p) => p.product.identifier);
      setEligible(await trialEligibility(ids));
      setPackages(resolved);
      if (!resolved.annual) setSelected('monthly');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const close = () => (onDone ? onDone() : router.back());

  // Free trial: only sold when the selected product has one and Apple says
  // this user can still take it (RevenueCat eligibility check).
  const selectedPkg = selected === 'monthly' ? packages.monthly : packages.annual;
  const trial = freeTrialOf(selectedPkg?.product);
  const showTrial = WEB_DEMO || (!!trial && !!selectedPkg && !!eligible[selectedPkg.product.identifier]);
  const trialDays = WEB_DEMO ? 7 : trial?.days ?? 0;
  const selectedPrice = selected === 'monthly' ? monthlyPriceOf() : annualPriceOf();
  const ctaLabel = showTrial
    ? trialDays === 7
      ? 'Start my free week'
      : `Start my ${trialDays} day free trial`
    : 'Continue';
  const trialTerms = showTrial
    ? `Free for ${trialDays} days, then ${selectedPrice}${
        selected === 'monthly' ? ' a month' : ' a year'
      } from ${formatRenewalDate(trialEndDate(trialDays))}. We remind you ${reminderLeadLabel(
        trialDays
      )} before it ends. Cancel anytime.`
    : null;
  const reminderDay = trialDays - (trialDays > 3 ? 2 : 1);

  function monthlyPriceOf() {
    return packages.monthly?.product.priceString ?? DEMO_PRICES.monthly;
  }
  function annualPriceOf() {
    return packages.annual?.product.priceString ?? DEMO_PRICES.annual;
  }

  const handlePurchase = async () => {
    const pkg = selected === 'monthly' ? packages.monthly : packages.annual;
    setNotice(null);
    if (!pkg) {
      setNotice('That plan is not available right now. Please try again in a moment.');
      return;
    }
    if (__DEV__) {
      console.log('[Paywall] purchase pressed', {
        variant,
        plan: selected,
        package: pkg.identifier,
      });
    }
    Haptics.selectionAsync();
    trackEvent('purchase_started', { variant, plan: selected, source });
    setPurchasing(true);
    try {
      const ok = await purchasePackage(pkg);
      if (__DEV__) console.log('[Paywall] purchasePackage returned:', ok);
      if (ok) {
        setPremiumOptimistic(true);
        await setCachedPremiumStatus(true).catch(() => {});
        trackEvent('purchase_completed', { variant, plan: selected, trial: showTrial });
        if (showTrial && trial) {
          await scheduleTrialEndingReminder(trial, pkg.product.priceString, 'SayBright');
        }
        refreshPremiumStatus().catch(() => {});
        toast.show('Welcome to SayBright Premium.');
        close();
      } else {
        trackEvent('purchase_cancelled', { variant, plan: selected });
      }
    } catch (error) {
      console.warn('[Paywall] purchase error:', error);
      setNotice('Something went wrong. Please try again in a moment.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setNotice(null);
    setRestoring(true);
    const ok = await restorePurchases();
    if (ok) {
      trackEvent('purchase_restored');
      setPremiumOptimistic(true);
      await setCachedPremiumStatus(true).catch(() => {});
      refreshPremiumStatus().catch(() => {});
      toast.show('Purchases restored successfully.');
      close();
    } else {
      setNotice('We could not find a previous purchase for this Apple ID.');
    }
    setRestoring(false);
  };

  const monthlyPrice = monthlyPriceOf();
  const annualPrice = annualPriceOf();
  const annualSavings = (() => {
    const m = WEB_DEMO ? 0.99 : packages.monthly?.product.price;
    const a = WEB_DEMO ? 9.99 : packages.annual?.product.price;
    if (!m || !a) return null;
    const pct = Math.round((1 - a / (m * 12)) * 100);
    return pct > 0 ? pct : null;
  })();
  const hasAnnual = WEB_DEMO || !!packages.annual || (__DEV__ && !packages.monthly);

  return {
    loading,
    error,
    packages,
    selected,
    setSelected,
    purchasing,
    restoring,
    monthlyPrice,
    annualPrice,
    showTrial,
    trialDays,
    reminderDay,
    annualSavings,
    hasAnnual,
    notice,
    ctaLabel,
    trialTerms,
    handlePurchase,
    handleRestore,
    loadOfferings,
    close,
  };
}
