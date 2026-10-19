import React, {useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';

import {beacon} from './api';
import {Cook, type Step} from './screens/Cook';
import {DEFAULT_APPS, Home, type Visit} from './screens/Home';
import type {Consent} from './screens/LiveChrome';
import {type App as SiteApp, LivePage} from './screens/LivePage';
import {backClaim} from './ui/back';
import {C} from './ui/theme';

// What's on screen. Back pops one; Home stays at the bottom.
type Screen =
  | {kind: 'home'}
  | {kind: 'live'; url: string}
  | {kind: 'cook'; title: string; steps: Step[]};

export const App = () => {
  const [stack, setStack] = useState<Screen[]>([{kind: 'home'}]);
  const top = stack[stack.length - 1];
  const push = (s: Screen) => setStack(st => [...st, s]);
  // The viewer's choices for this session: cookies on websites, the sites on Home, the last page visited.
  const [consent, setConsent] = useState<Consent>('necessary');
  const [apps, setApps] = useState<SiteApp[]>(DEFAULT_APPS);
  const [last, setLast] = useState<Visit | null>(null);
  const pin = (app: SiteApp) => setApps(all => [app, ...all.filter(a => a.name !== app.name)]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // The live page closes its own layers (panel, sheets, highlight) before Back leaves it.
      const claimed = !!backClaim.current?.();
      beacon({t: 'back', depth: stack.length, top: stack[stack.length - 1].kind, claimed});
      if (claimed) {
        return true;
      }
      if (stack.length <= 1) {
        return false;
      }
      setStack(s => s.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  // A live page stays loaded under Cook mode, so Back returns to the same place on it.
  const live = [...stack].reverse().find(s => s.kind === 'live') as {kind: 'live'; url: string} | undefined;
  return (
    <View style={styles.fill}>
      {top.kind === 'home' && (
        <Home apps={apps} last={last} consent={consent} onConsent={setConsent} onOpen={url => push({kind: 'live', url})} />
      )}
      {live && top.kind !== 'home' && (
        <LivePage
          key={live.url}
          url={live.url}
          consent={consent}
          covered={top.kind !== 'live'}
          onCook={(title, steps) => push({kind: 'cook', title, steps})}
          onPin={pin}
          onVisit={setLast}
        />
      )}
      {top.kind === 'cook' && (
        <View style={styles.cover}>
          <Cook title={top.title} steps={top.steps} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: C.bg},
  cover: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
});
