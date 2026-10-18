import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { C, SKIES, type DayPeriod } from '../../theme/colors';

/**
 * The hero illustration: the icon's rising sun over soft dawn hills, with the
 * sun's height and color following the time of day (a pale moon disc at night).
 * Drawn in a 360 by 200 box and scaled to the width it is given. It has its own
 * space in the layout and never sits under text.
 */
export default function SunriseHero({
  width,
  period = 'morning',
  hills = true,
  height: fixedHeight,
}: {
  width: number;
  period?: DayPeriod;
  hills?: boolean;
  /** Fixed height for full bleed use: the scene fills it, anchored at the bottom. */
  height?: number;
}) {
  const sky = SKIES[period];
  const height = fixedHeight ?? (width * 200) / 360;
  // Sun center: lower on the horizon at dawn and dusk, higher midday
  const cy = 160 - sky.sun * 80;
  const night = period === 'night';
  const farOpacity = night ? 0.1 : 0.38;
  const nearOpacity = night ? 0.16 : 0.6;

  return (
    <Svg width={width} height={height} viewBox="0 0 360 200" preserveAspectRatio={fixedHeight ? 'xMidYMax slice' : 'xMidYMid meet'}>
      <Defs>
        <RadialGradient id="shHalo" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={sky.sunColor[0]} stopOpacity={night ? 0.35 : 0.6} />
          <Stop offset="1" stopColor={sky.sunColor[0]} stopOpacity={0} />
        </RadialGradient>
        {/* Hills fade into the sky at the bottom edge, so there is no hard line */}
        <LinearGradient id="shFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.white} stopOpacity={farOpacity} />
          <Stop offset="1" stopColor={C.white} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="shNear" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.white} stopOpacity={nearOpacity} />
          <Stop offset="1" stopColor={C.white} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="shSun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.sunColor[0]} />
          <Stop offset="1" stopColor={sky.sunColor[1]} />
        </LinearGradient>
      </Defs>
      <Circle cx={180} cy={cy} r={86} fill="url(#shHalo)" />
      <Circle cx={180} cy={cy} r={night ? 30 : 38} fill="url(#shSun)" />
      {night ? <Circle cx={192} cy={cy - 8} r={26} fill={sky.colors[1]} opacity={0.9} /> : null}
      {hills ? (
        <>
          <Path d="M0 150 C60 118 120 116 180 136 C240 156 300 128 360 120 V200 H0 Z" fill="url(#shFar)" />
          <Path d="M0 172 C70 148 140 150 200 166 C260 182 310 164 360 156 V200 H0 Z" fill="url(#shNear)" />
        </>
      ) : null}
      {!night && !hills ? (
        <Path d={`M120 ${cy + 52} H240`} stroke={C.accent} strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      ) : null}
    </Svg>
  );
}
