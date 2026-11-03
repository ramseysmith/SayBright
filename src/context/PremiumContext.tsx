import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  BillingIssue,
  billingIssueFrom,
  fetchCustomerInfo,
  isPremiumFrom,
  onCustomerInfoUpdate,
} from '../services/purchases';
import {
  getCachedPremiumStatus,
  setCachedPremiumStatus,
} from '../services/storage';

/** Web export only: lets store screenshots show the Premium state. Never set in a build. */
const DEMO_PREMIUM = Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEMO_PREMIUM === '1';
/** Web export only: shows the billing issue banner for layout checks. Never set in a build. */
const DEMO_BILLING_ISSUE = Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEMO_BILLING_ISSUE === '1';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  /** Set while Apple retries a failed Premium charge */
  billingIssue: BillingIssue | null;
  refreshPremiumStatus: () => Promise<void>;
  setPremiumOptimistic: (value: boolean) => void;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoading: true,
  billingIssue: null,
  refreshPremiumStatus: async () => {},
  setPremiumOptimistic: () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [billingIssue, setBillingIssue] = useState<BillingIssue | null>(
    DEMO_BILLING_ISSUE ? { inGrace: true, url: 'https://apps.apple.com/account/subscriptions' } : null
  );

  const applyLive = useCallback((live: boolean) => {
    setIsPremium((prev) => {
      if (prev !== live) {
        setCachedPremiumStatus(live).catch(() => {});
      }
      return live;
    });
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    if (DEMO_PREMIUM) {
      setIsPremium(true);
      setIsLoading(false);
      return;
    }
    try {
      const info = await fetchCustomerInfo();
      if (info) {
        const live = isPremiumFrom(info);
        if (__DEV__) console.log('[PremiumContext] refreshPremiumStatus live:', live);
        applyLive(live);
        if (!DEMO_BILLING_ISSUE) setBillingIssue(billingIssueFrom(info));
      }
    } catch (error) {
      console.warn('[PremiumContext] refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyLive]);

  const setPremiumOptimistic = useCallback((value: boolean) => {
    if (__DEV__) console.log('[PremiumContext] setPremiumOptimistic:', value);
    setIsPremium(value);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const cached = await getCachedPremiumStatus();
      if (!active) return;
      setIsPremium(cached);
      await refreshPremiumStatus();
    })();
    return () => {
      active = false;
    };
  }, [refreshPremiumStatus]);

  // Keeps Premium current while the app stays open: RevenueCat pushes renewals,
  // expiries and billing issues, and the app refetches on return to foreground.
  useEffect(() => {
    if (DEMO_PREMIUM || Platform.OS === 'web') return;
    const off = onCustomerInfoUpdate((info) => {
      applyLive(isPremiumFrom(info));
      setBillingIssue(billingIssueFrom(info));
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPremiumStatus().catch(() => {});
    });
    return () => {
      off();
      sub.remove();
    };
  }, [applyLive, refreshPremiumStatus]);

  return (
    <PremiumContext.Provider
      value={{ isPremium, isLoading, billingIssue, refreshPremiumStatus, setPremiumOptimistic }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}
