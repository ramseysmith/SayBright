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

SplashScreen.preventAutoHideAsync().catch(() => {});

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
      await updateUserData((current) => ({
        ...current,
        sessionCount: current.sessionCount + 1,
      }));
      const data = await getUserData();
      setSeen(data.preferences.hasSeenOnboarding);
      setBootChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, bootChecked]);

  useEffect(() => {
    if (!bootChecked || hasSeenOnboarding === null) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (hasSeenOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [bootChecked, hasSeenOnboarding, segments, router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
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
