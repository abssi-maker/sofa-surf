import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {C, T, sized} from '../ui/theme';
import {useKeys} from '../ui/useKeys';

export type Step = {n: number; text: string};

// "about 9 minutes", "6 to 8 minutes": the time the recipe itself gives (the longer one), never a guess.
const MINUTES = /(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s*(?:minutes?|mins?)\b/i;
const minutesIn = (text: string) => {
  const m = MINUTES.exec(text);
  return m ? Number(m[2] ?? m[1]) : null;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Cook mode: one step fills the TV, readable from the stove. ◀ ▶ move, OK starts the step's timer, Back returns.
// The timer keeps running while you move on, like a kitchen timer.
export const Cook = ({title, steps}: {title: string; steps: Step[]}) => {
  const [i, setI] = useState(0);
  const [timer, setTimer] = useState<{step: number; total: number; endsAt: number} | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) {
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [timer]);

  const step = steps[i];
  const minutes = step ? minutesIn(step.text) : null;
  useKeys({
    right: () => setI(n => Math.min(n + 1, steps.length - 1)),
    left: () => setI(n => Math.max(n - 1, 0)),
    select: () => {
      if (timer && timer.step === i) {
        setTimer(null);
      } else if (minutes) {
        setTimer({step: i, total: minutes * 60, endsAt: Date.now() + minutes * 60 * 1000});
        setNow(Date.now());
      }
    },
  });
  const left = timer ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : 0;
  const long = (step?.text.length ?? 0) > 320;
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Text style={styles.kicker} numberOfLines={1}>
          COOK MODE · {title}
        </Text>
        {timer && (
          <View style={[styles.timer, left === 0 && styles.timerDone]}>
            <Text style={[styles.timerText, left === 0 && styles.timerTextDone]}>
              {left === 0 ? `Step ${timer.step + 1}: time's up` : `Step ${timer.step + 1} · ${clock(left)}`}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.count}>
        Step {i + 1} <Text style={styles.of}>of {steps.length}</Text>
      </Text>
      <Text style={[styles.text, long && styles.textLong]}>{step?.text}</Text>
      <View style={styles.progress}>
        {steps.map((s, k) => (
          <View key={s.n} style={[styles.segment, k <= i && styles.segmentDone]} />
        ))}
      </View>
      <Text style={styles.hint}>
        {i > 0 ? '◀︎ Previous    ' : ''}
        {i < steps.length - 1 ? 'Next ▶︎    ' : 'Enjoy your meal    '}
        {minutes ? (timer && timer.step === i ? 'OK  Stop the timer    ' : `OK  Start a ${minutes}-minute timer    `) : ''}
        ← Back to the recipe
      </Text>
    </View>
  );
};

const styles = StyleSheet.create(sized({
  page: {flex: 1, backgroundColor: C.bg, paddingHorizontal: 140, paddingVertical: 90},
  head: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 30},
  kicker: {flex: 1, color: C.accent, fontSize: T.label, fontWeight: '700', letterSpacing: 2},
  timer: {backgroundColor: C.panel, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 30, borderWidth: 3, borderColor: C.accent},
  timerDone: {backgroundColor: C.accent},
  timerText: {color: C.accent, fontSize: T.title - 6, fontWeight: '800'},
  timerTextDone: {color: C.bg},
  count: {color: C.text, fontSize: 96, fontWeight: '800', marginTop: 24, marginBottom: 32},
  of: {color: C.dim, fontSize: 48, fontWeight: '600'},
  text: {flex: 1, color: C.text, fontSize: 54, lineHeight: 76, fontWeight: '500'},
  textLong: {fontSize: 42, lineHeight: 60},
  progress: {flexDirection: 'row', gap: 12, marginBottom: 28},
  segment: {flex: 1, height: 10, borderRadius: 5, backgroundColor: C.panel},
  segmentDone: {backgroundColor: C.accent},
  hint: {color: C.dim, fontSize: T.label},
}));
