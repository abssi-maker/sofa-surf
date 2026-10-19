import {Dimensions} from 'react-native';

// Everything is designed on a 1920×1080 canvas, read from 3 metres away.
// The device's layout canvas can be smaller (the Virtual Device reports about
// half that), so every size goes through px().
const S = Dimensions.get('window').width / 1920;
export const px = (n: number) => Math.round(n * S);

// Scales the size and spacing numbers of a style sheet definition.
const SIZED = /^(width|height|min|max|padding|margin|gap|rowGap|columnGap|top|left|right|bottom|fontSize|lineHeight|border.*(Radius|Width))/;
export function sized<T extends Record<string, object>>(sheet: T): T {
  const out: Record<string, object> = {};
  for (const [name, style] of Object.entries(sheet)) {
    out[name] = Object.fromEntries(
      Object.entries(style).map(([k, v]) => [k, typeof v === 'number' && SIZED.test(k) ? px(v) : v]),
    );
  }
  return out as T;
}

export const C = {
  bg: '#0B0F17',
  panel: '#151B26',
  text: '#F2F4F8',
  dim: '#9AA4B5',
  accent: '#FFB547',
  focus: '#FFFFFF',
};

export const T = {
  hero: 64,
  title: 48,
  body: 34,
  label: 28,
  small: 24,
};
