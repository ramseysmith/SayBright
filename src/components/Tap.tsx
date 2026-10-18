import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Pressable with static styles and a pressed look.
 *
 * Never pass Pressable a style function (`style={({ pressed }) => ...}`) in this
 * app: style functions were dropped on iOS in Drift 1.18.0 build 53 (NativeWind), so the whole style
 * (flexDirection, padding, borders) silently disappears. That bug broke the
 * Settings rows and the Home cards in 1.18.0 build 53. Use Tap instead.
 */
interface TapProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Merged over style while pressed. Defaults to a light dim. */
  pressedStyle?: StyleProp<ViewStyle>;
}

export default function Tap({ style, pressedStyle, onPressIn, onPressOut, children, ...rest }: TapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[style, pressed ? (pressedStyle ?? { opacity: 0.85 }) : null]}
    >
      {children}
    </Pressable>
  );
}
