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
  const { refreshPremiumStatus } = usePremium();
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
      setError(true);
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
      toast.show('That plan is not available right now.');
      return;
    }
    Haptics.selectionAsync();
    trackEvent('purchase_started', { variant, plan: selected });
    setPurchasing(true);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) {
        trackEvent('purchase_completed', { variant, plan: selected });
        await refreshPremiumStatus();
        toast.show('Welcome to SayBright Premium.');
        router.back();
      } else {
        trackEvent('purchase_cancelled', { variant, plan: selected });
      }
    } catch {
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
      await refreshPremiumStatus();
      toast.show('Purchases restored successfully.');
      router.back();
    } else {
      toast.show('No previous purchases found.');
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
