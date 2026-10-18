import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { C } from '../../theme/colors';

/**
 * The SayBright mark: the speech bubble with a rising sun, exactly as drawn in
 * design/icon/icon.svg (same 1024 box), without the sky behind it. Used by the
 * splash, onboarding and the paywall so the app and its icon read as one brand.
 * `rays` lets the splash animate the rays separately.
 */
export default function BrightMark({ size = 120, rays = true }: { size?: number; rays?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="bmSun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.goldLight} />
          <Stop offset="1" stopColor={C.goldDeep} />
        </LinearGradient>
        <LinearGradient id="bmBubble" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.bubble} />
          <Stop offset="1" stopColor={C.bubbleShade} />
        </LinearGradient>
      </Defs>
      <Path
        d="M310 262 H714 A118 118 0 0 1 832 380 V598 A118 118 0 0 1 714 716 H420 L300 812 L326 716 H310 A118 118 0 0 1 192 598 V380 A118 118 0 0 1 310 262 Z"
        fill="url(#bmBubble)"
      />
      {rays ? <MarkRays /> : null}
      <Path d="M376 590 A136 136 0 0 1 648 590 Z" fill="url(#bmSun)" />
      <Path d="M322 590 H702" stroke={C.accent} strokeWidth={30} strokeLinecap="round" />
      <Path d="M400 644 H624" stroke={C.accent} strokeWidth={24} strokeLinecap="round" opacity={0.45} />
    </Svg>
  );
}

/** The three rays alone, in the mark's 1024 box, for layering in animations. */
export function MarkRays() {
  return (
    <G stroke={C.gold} strokeWidth={34} strokeLinecap="round" fill="none">
      <Path d="M512 336 V384" />
      <Path d="M378 398 L410 430" />
      <Path d="M646 398 L614 430" />
    </G>
  );
}

export function MarkRaysSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <MarkRays />
    </Svg>
  );
}
