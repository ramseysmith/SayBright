import { useEffect, useState } from 'react';
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
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { trackEvent } from '../src/services/analytics';

SplashScreen.preventAutoHideAsync().catch(() => {});

let welcomeShownThisSession = false;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  const [bootChecked, setBootChecked] = useState(false);
  const [hasSeenOnboarding, setSeen] = useState<boolean | null>(null);
  const [splashDone, setSplashDone] = useState(false);
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
      setSeen(updated.preferences.hasSeenOnboarding);
      setBootChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, bootChecked]);

  useEffect(() => {
    if (!bootChecked) return;
    if (!splashDone) return;
    let cancelled = false;
    (async () => {
      const data = await getUserData();
      if (cancelled) return;
      const seen = data.preferences.hasSeenOnboarding;
      setSeen((prev) => (prev === seen ? prev : seen));
      const root = segments[0];
      const inOnboarding = root === 'onboarding';
      const inWelcome = root === 'welcome';
      const inTabs = root === '(tabs)';

      if (!seen) {
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }

      if (!welcomeShownThisSession) {
        if (!inWelcome) {
          welcomeShownThisSession = true;
          router.replace('/welcome');
        } else {
          welcomeShownThisSession = true;
        }
        return;
      }

      if (inOnboarding) {
        router.replace('/(tabs)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootChecked, splashDone, segments, router]);

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

  if (!fontsLoaded || !bootChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primaryGold} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PremiumProvider>
          <ToastProvider>
            <ShareProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="onboarding"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="welcome"
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
              {!splashDone ? (
                <AnimatedSplash onFinished={() => setSplashDone(true)} />
              ) : null}
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
