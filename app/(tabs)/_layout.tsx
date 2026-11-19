import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { BannerAdWrapper } from '../../src/components/BannerAdWrapper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FONTS } from '../../src/constants/theme';
import { C } from '../../src/theme/colors';
import { TabIcon, type TabIconName } from '../../src/components/art/TabIcons';

function AnimatedTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: TabIconName;
  color: string;
  size: number;
  focused: boolean;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 14,
      stiffness: 200,
    });
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={style}>
      <TabIcon name={name} color={color} focused={focused} size={size} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      // One banner lives here, above the tab bar, rather than one per screen.
      // React reconciles this subtree across tab changes so the BannerAd stays
      // mounted and keeps showing the same ad instead of refetching.
      tabBar={(props) => (
        <>
          <BannerAdWrapper />
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.bg0,
          borderTopColor: C.border,
          shadowColor: C.shadow,
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 6,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.bodyMedium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="today"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="browse"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="favorites"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="settings"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
