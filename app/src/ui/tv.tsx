// The Netflix-style building blocks: the home screen and Nova's designs both draw with these.
import React, {useEffect, useRef} from 'react';
import {Animated, Image, ScrollView, StyleSheet, Text, View} from 'react-native';

import {img} from '../api';
import {Focusable} from './Focusable';
import {C, T, px, sized} from './theme';

// A fade from the background colour to clear, made of bands (Vega has no gradient view).
export const Fade = ({side, size}: {side: 'left' | 'bottom'; size: number}) => {
  const n = 24;
  const bands = Array.from({length: n}, (_, i) => Math.pow(1 - i / n, 1.6));
  const horizontal = side === 'left';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fade,
        horizontal ? {left: 0, top: 0, bottom: 0, width: size, flexDirection: 'row'} : {left: 0, right: 0, bottom: 0, height: size, flexDirection: 'column-reverse'},
      ]}>
      {bands.map((o, i) => (
        <View key={i} style={{flex: 1, backgroundColor: C.bg, opacity: o}} />
      ))}
    </View>
  );
};

// Full-width hero: a photo on the right that fades into the page, the title on the left.
export const Billboard = ({
  image,
  kicker,
  title,
  subtitle,
  children,
}: {
  image?: string | null;
  kicker?: string | null;
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
}) => (
  <View style={styles.billboard}>
    {!!image && <Image source={{uri: img(image, 1600)}} style={styles.billboardImage} resizeMode="cover" />}
    <View style={styles.billboardImageEdge}>
      <Fade side="left" size={px(560)} />
    </View>
    <Fade side="bottom" size={px(320)} />
    <View style={styles.billboardText}>
      {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
      <Text style={styles.billboardTitle} numberOfLines={2}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.billboardSubtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      )}
      <View style={styles.buttons}>{children}</View>
    </View>
  </View>
);

// A button: translucent, white with dark text when focused.
export const Pill = ({label, onPress, preferred}: {label: string; onPress: () => void; preferred?: boolean}) => (
  <Focusable onPress={onPress} preferred={preferred} style={styles.pill} focusedStyle={styles.pillFocused} ring={false} grow={1.08}>
    {focused => <Text style={[styles.pillText, focused && styles.pillTextFocused]}>{label}</Text>}
  </Focusable>
);

// A Netflix row: a title and tiles that scroll sideways.
export const Shelf = ({title, children}: {title?: string | null; children: React.ReactNode}) => (
  <View style={styles.shelf}>
    {!!title && <Text style={styles.shelfTitle}>{title}</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
      {children}
    </ScrollView>
  </View>
);

// A 16:9 card. Without a photo it becomes a text card (the Ask Nova questions).
export const Tile = ({
  title,
  image,
  caption,
  onPress,
  preferred,
  icon,
}: {
  title: string;
  image?: string | null;
  caption?: string | null;
  onPress: () => void;
  preferred?: boolean;
  icon?: string;
}) => (
  <Focusable onPress={onPress} preferred={preferred} style={styles.tile} grow={1.08}>
    {focused => (
      <>
        {image ? (
          <Image source={{uri: img(image, 640)}} style={styles.tileImage} resizeMode="cover" />
        ) : (
          <View style={[styles.tileImage, styles.tileText]}>
            {!!icon && <Text style={styles.tileIcon}>{icon}</Text>}
            <Text style={styles.tileQuestion} numberOfLines={3}>
              {title}
            </Text>
          </View>
        )}
        {!!image && (
          <View style={styles.tileLabel}>
            <Text style={[styles.tileTitle, focused && styles.tileTitleFocused]} numberOfLines={2}>
              {title}
            </Text>
            {!!caption && (
              <Text style={styles.tileCaption} numberOfLines={1}>
                {caption}
              </Text>
            )}
          </View>
        )}
      </>
    )}
  </Focusable>
);

export const Chip = ({text}: {text: string}) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

// Pulses forever: the "Nova is working" signal.
export const Pulse = ({children, style}: {children: React.ReactNode; style?: object}) => {
  const o = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(o, {toValue: 0.35, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[style, {opacity: o}]}>{children}</Animated.View>;
};

// Says who made this screen, and that the AI is simulated until Bedrock is live.
export const NovaBadge = ({simulated, ms}: {simulated: boolean; ms: number}) => (
  <View style={styles.badge} pointerEvents="none">
    <Text style={styles.badgeText}>✦ Designed by Nova</Text>
    <Text style={styles.badgeMeta}>
      {simulated ? 'simulated · ' : ''}
      {(ms / 1000).toFixed(1)} s
    </Text>
  </View>
);

const W = 1920;

const styles = StyleSheet.create(sized({
  fade: {position: 'absolute'},
  billboard: {width: W, height: 780, backgroundColor: C.bg, justifyContent: 'flex-end'},
  billboardImage: {position: 'absolute', right: 0, top: 0, width: 1340, height: 780},
  billboardImageEdge: {position: 'absolute', left: 580, top: 0, bottom: 0, width: 560},
  billboardText: {paddingHorizontal: 96, paddingBottom: 72, width: 1060},
  kicker: {color: C.accent, fontSize: T.label, fontWeight: '700', letterSpacing: 2, marginBottom: 12},
  billboardTitle: {color: C.text, fontSize: 76, lineHeight: 84, fontWeight: '800', marginBottom: 18},
  billboardSubtitle: {color: C.dim, fontSize: T.label + 2, lineHeight: 42, marginBottom: 36},
  buttons: {flexDirection: 'row', gap: 24},
  pill: {backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 40},
  pillFocused: {backgroundColor: C.focus},
  pillText: {color: C.text, fontSize: T.label, fontWeight: '700'},
  pillTextFocused: {color: C.bg},
  shelf: {marginBottom: 44},
  shelfTitle: {color: C.text, fontSize: T.label + 4, fontWeight: '700', marginLeft: 96, marginBottom: 18},
  shelfRow: {paddingHorizontal: 96, paddingVertical: 14, gap: 28},
  tile: {width: 440, backgroundColor: C.panel, overflow: 'hidden'},
  tileImage: {width: 432, height: 243, borderTopLeftRadius: 14, borderTopRightRadius: 14},
  tileText: {padding: 32, justifyContent: 'center', backgroundColor: '#1E2636', borderRadius: 14},
  tileIcon: {color: C.accent, fontSize: 40, marginBottom: 12},
  tileQuestion: {color: C.text, fontSize: T.label + 2, fontWeight: '700', lineHeight: 40},
  tileLabel: {padding: 18, height: 112},
  tileTitle: {color: C.dim, fontSize: T.small, fontWeight: '600', lineHeight: 32},
  tileTitleFocused: {color: C.text},
  tileCaption: {color: C.accent, fontSize: T.small - 4, marginTop: 6},
  chip: {backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 40, paddingVertical: 10, paddingHorizontal: 24},
  chipText: {color: C.text, fontSize: T.small, fontWeight: '600'},
  badge: {position: 'absolute', top: 40, right: 60, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(11,15,23,0.72)', borderRadius: 40, paddingVertical: 10, paddingHorizontal: 24},
  badgeText: {color: C.accent, fontSize: T.small, fontWeight: '700'},
  badgeMeta: {color: C.dim, fontSize: T.small - 4},
}));
