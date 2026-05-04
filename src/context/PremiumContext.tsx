import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { checkPremiumStatus } from '../services/purchases';
import {
  getCachedPremiumStatus,
  setCachedPremiumStatus,
} from '../services/storage';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoading: true,
  refreshPremiumStatus: async () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const live = await checkPremiumStatus();
      setIsPremium((prev) => {
        if (prev !== live) {
          setCachedPremiumStatus(live).catch(() => {});
        }
        return live;
      });
    } catch {
      // keep cached value
    } finally {
      setIsLoading(false);
    }
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
      value={{ isPremium, isLoading, refreshPremiumStatus }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}
