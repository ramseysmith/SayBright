import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useURL } from 'expo-linking';
import { COLORS } from '../src/constants/theme';
import { getUserData, updateUserData } from '../src/services/storage';
import { ToastProvider } from '../src/components/Toast';
import { PremiumProvider } from '../src/context/PremiumContext';
import { ShareProvider } from '../src/context/ShareContext';
import { initializePurchases } from '../src/services/purchases';
import { WelcomeScreen } from '../src/components/WelcomeScreen';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { trackEvent } from '../src/services/analytics';
import { preloadInterstitial } from '../src/services/ads';

SplashScreen.preventAutoHideAsync().catch(() => {});

const OnboardingFlowContext = createContext<{
  completeOnboarding: () => void;
}>({
  completeOnboarding: () => {},
});

export function useOnboardingFlow() {
  return useContext(OnboardingFlowContext);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  const [bootChecked, setBootChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        try {
          await requestTrackingPermissionsAsync();
        } catch {
          // ignore
        }
      }
      await initializePurchases();
      const updated = await updateUserData((current) => ({
        ...current,
        sessionCount: current.sessionCount + 1,
      }));
      trackEvent('app_open', { sessionCount: updated.sessionCount });
      setNeedsOnboarding(!updated.preferences.hasSeenOnboarding);
      setBootChecked(true);
      preloadInterstitial();
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, bootChecked]);

  useEffect(() => {
    if (!bootChecked) return;
    if (needsOnboarding === null) return;
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    const inTabs = root === '(tabs)';
    if (needsOnboarding && inTabs) {
      router.replace('/onboarding');
    } else if (!needsOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [bootChecked, needsOnboarding, segments, router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      trackEvent('widget_tapped');
      router.replace('/(tabs)');
    });
    return () => sub.remove();
  }, [router]);

  const url = useURL();
  useEffect(() => {
    if (!url) return;
    if (url.startsWith('saybright://today') || url.includes('/today')) {
      router.replace('/(tabs)');
    }
  }, [url, router]);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  if (!fontsLoaded || !bootChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primaryGold} />
      </View>
    );
  }

  const inOnboarding = segments[0] === 'onboarding';
  const overlayVisible =
    showWelcome && needsOnboarding === false && !inOnboarding;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PremiumProvider>
          <ToastProvider>
            <ShareProvider>
              <OnboardingFlowContext.Provider value={{ completeOnboarding }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="onboarding"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="category/[id]"
                  options={{ headerShown: false, presentation: 'card' }}
                />
                <Stack.Screen
                  name="paywall"
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: true,
                  }}
                />
              </Stack>
              {overlayVisible ? (
                <WelcomeScreen
                  onDismiss={handleWelcomeDismiss}
                  startAnimations={!showSplash}
                />
              ) : null}
              {showSplash ? (
                <AnimatedSplash onComplete={handleSplashComplete} />
              ) : null}
              </OnboardingFlowContext.Provider>
            </ShareProvider>
          </ToastProvider>
        </PremiumProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
});
