import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { checkPremiumStatus } from '../services/purchases';
import {
  getCachedPremiumStatus,
  setCachedPremiumStatus,
} from '../services/storage';

/** Web export only: lets store screenshots show the Premium state. Never set in a build. */
const DEMO_PREMIUM = Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEMO_PREMIUM === '1';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
  setPremiumOptimistic: (value: boolean) => void;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoading: true,
  refreshPremiumStatus: async () => {},
  setPremiumOptimistic: () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    if (DEMO_PREMIUM) {
      setIsPremium(true);
      setIsLoading(false);
      return;
    }
    try {
      const live = await checkPremiumStatus();
      if (__DEV__) console.log('[PremiumContext] refreshPremiumStatus live:', live);
      setIsPremium((prev) => {
        if (prev !== live) {
          setCachedPremiumStatus(live).catch(() => {});
        }
        return live;
      });
    } catch (error) {
      console.warn('[PremiumContext] refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <PremiumContext.Provider
      value={{ isPremium, isLoading, refreshPremiumStatus, setPremiumOptimistic }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}
