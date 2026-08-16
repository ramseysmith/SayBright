import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
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

export function usePaywallController(variant: 'A' | 'B' | 'C') {
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

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setError(false);
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
      setPackages(resolved);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const close = () => router.back();

  const handlePurchase = async () => {
    const pkg = selected === 'monthly' ? packages.monthly : packages.annual;
    if (!pkg) {
      // Alert, not toast: the paywall is a native modal, and the toast renders
      // in the root tree underneath it where the user would never see it.
      Alert.alert(
        'Plan unavailable',
        'That plan is not available right now. Please try again in a moment.'
      );
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
    trackEvent('purchase_started', { variant, plan: selected });
    setPurchasing(true);
    try {
      const ok = await purchasePackage(pkg);
      if (__DEV__) console.log('[Paywall] purchasePackage returned:', ok);
      if (ok) {
        setPremiumOptimistic(true);
        await setCachedPremiumStatus(true).catch(() => {});
        trackEvent('purchase_completed', { variant, plan: selected });
        refreshPremiumStatus().catch(() => {});
        toast.show('Welcome to SayBright Premium.');
        router.back();
      } else {
        trackEvent('purchase_cancelled', { variant, plan: selected });
      }
    } catch (error) {
      console.warn('[Paywall] purchase error:', error);
      Alert.alert(
        'Purchase failed',
        'Something went wrong. Please try again in a moment.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await restorePurchases();
    if (ok) {
      setPremiumOptimistic(true);
      await setCachedPremiumStatus(true).catch(() => {});
      refreshPremiumStatus().catch(() => {});
      toast.show('Purchases restored successfully.');
      router.back();
    } else {
      // Same reason as above: this one stays on the paywall, so it must be an
      // Alert to be visible at all.
      Alert.alert(
        'Nothing to restore',
        'We could not find a previous purchase for this Apple ID.'
      );
    }
    setRestoring(false);
  };

  const monthlyPrice = packages.monthly?.product.priceString ?? '$0.99';
  const annualPrice = packages.annual?.product.priceString ?? '$9.99';

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
    handlePurchase,
    handleRestore,
    loadOfferings,
    close,
  };
}
