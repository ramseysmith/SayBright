import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { Affirmation } from '../data/affirmations';
import { getTimeOfDay, TimeGradient } from '../utils/time';
import { ShareCard } from '../components/ShareCard';
import { usePremium } from './PremiumContext';
import { useToast } from '../components/Toast';
import { trackEvent } from '../services/analytics';

interface ShareContextValue {
  shareAffirmation: (affirmation: Affirmation) => Promise<void>;
}

const ShareContext = createContext<ShareContextValue>({
  shareAffirmation: async () => {},
});

export function useShare(): ShareContextValue {
  return useContext(ShareContext);
}

export function ShareProvider({ children }: { children: ReactNode }) {
  const cardRef = useRef<View>(null);
  const [pending, setPending] = useState<Affirmation | null>(null);
  const [gradient, setGradient] = useState<TimeGradient>(
    getTimeOfDay().gradient
  );
  const { isPremium } = usePremium();
  const toast = useToast();

  const shareAffirmation = useCallback(
    async (affirmation: Affirmation) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const tod = getTimeOfDay();
      setGradient(tod.gradient);
      setPending(affirmation);

      // Wait for render before capturing
      await new Promise((resolve) => setTimeout(resolve, 120));

      try {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          toast.show('Sharing is not available on this device.');
          return;
        }
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your affirmation',
        });
        trackEvent('affirmation_shared', {
          affirmationId: affirmation.id,
          isPremium,
        });
      } catch {
        toast.show('Could not generate share card.');
      } finally {
        setPending(null);
      }
    },
    [toast]
  );

  return (
    <ShareContext.Provider value={{ shareAffirmation }}>
      {children}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard
          ref={cardRef}
          affirmation={pending}
          gradient={gradient}
          isPremium={isPremium}
        />
      </View>
    </ShareContext.Provider>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: 0,
    left: -10000,
    width: 540,
    height: 960,
    opacity: 0,
  },
});
