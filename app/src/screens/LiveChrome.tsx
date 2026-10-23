// Sofa Surf's layer around the real page: the top bar (Sofa Surf's address bar while Nova reads, then the
// site's own app bar: Sofa mode), the page's sections on the left, remote hints, the Ask panel, and sheets.
// Everything here is native and draws above the WebView. The ✦ glyph and amber mark what the AI did; the
// page itself stays the site's own.
import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';

import {BACKEND} from '../api';
import {C, T, sized} from '../ui/theme';
import {Pulse} from '../ui/tv';

// Where the page sits on the 1920×1080 canvas.
export const FRAME = {top: 96, left: 380, bottom: 80};
// The page is laid out this many CSS px wide inside its frame (1.5× on a 1920 screen): most sites switch
// to their own tablet layout, so text is sofa-sized without copying or restyling anything.
export const LAYOUT_WIDTH = 1024;
export type Consent = 'necessary' | 'all';
export const frameScript = (consent: Consent) =>
  `window.__ckFrame = {frac: ${(1920 - FRAME.left) / 1920}, width: ${LAYOUT_WIDTH}, consent: ${JSON.stringify(consent)}};\n`;

// Remote keys as text glyphs (U+FE0E asks for the text form: without it ▶ and ◀ draw as emoji).
export const KEY = {play: '▶︎❚❚', skip: '◀︎◀︎  ▶︎▶︎', back: '←', menu: '≡', ok: 'OK', updown: '▲▼', sides: '◀︎ ▶︎'};

export type NovaState = {status: 'reading'} | {status: 'done'; ms: number; simulated: boolean; parts: number} | {status: 'off'; why?: string};
export type Site = {name: string; color: string | null; icon: string | null; tabs: {label: string; href: string}[]};

// Light brand colours (white, cream) get dark text, so the bar stays readable.
const isLight = (hex: string) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) {
    return false;
  }
  const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
};

const novaLine = (nova: NovaState) =>
  nova.status === 'done'
    ? `${nova.ms < 400 ? 'remembered' : `${(nova.ms / 1000).toFixed(1)} s`} · ${nova.parts} parts mapped${nova.simulated ? ' (simulated)' : ''}`
    : nova.status === 'off'
      ? nova.why ?? 'page structure only'
      : '';

// Two bars, cross-faded: Sofa Surf's own while Nova reads the page, then the site's app bar.
export const TopBar = ({mode, host, path, nova, mapMs, site, tab}: {mode: 'browser' | 'app'; host: string; path: string; nova: NovaState; mapMs?: number; site: Site | null; tab: number | null}) => {
  const show = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(show, {toValue: mode === 'app' ? 1 : 0, duration: 650, useNativeDriver: true}).start();
  }, [mode, show]);
  const brand = site?.color ?? C.panel;
  const ink = isLight(brand) ? {color: C.bg} : null;
  return (
    <View style={styles.top}>
      <Animated.View style={[styles.bar, {opacity: show.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]}>
        <Text style={styles.brand}>
          Sofa <Text style={styles.brandAccent}>Surf</Text>
        </Text>
        <View style={styles.address}>
          <Text style={styles.host} numberOfLines={1}>
            {host}
            <Text style={styles.path}>{path}</Text>
          </Text>
        </View>
        <View style={styles.status}>
          {nova.status === 'reading' ? (
            <Pulse>
              <Text style={styles.statusAi}>✦ Nova is reading the page…</Text>
            </Pulse>
          ) : (
            <Text style={styles.statusAi}>✦ {nova.status === 'done' ? 'Refined by Nova' : 'Ready'}</Text>
          )}
          {mapMs !== undefined && <Text style={styles.statusDim}>Remote ready in {(mapMs / 1000).toFixed(1)} s</Text>}
        </View>
      </Animated.View>
      {site && (
        <Animated.View style={[styles.bar, styles.appBar, {backgroundColor: brand, opacity: show}]} pointerEvents="none">
          {site.icon ? <Image source={{uri: site.icon}} style={styles.icon} /> : <View style={[styles.icon, styles.iconBlank]} />}
          <Text style={[styles.siteName, ink]} numberOfLines={1}>
            {site.name}
          </Text>
          <View style={styles.tabs}>
            {site.tabs.slice(0, 6).map((t, i) => (
              <View key={t.href} style={[styles.tab, ink && styles.tabOnLight, tab === i && (ink ? styles.tabOnDark : styles.tabOn)]}>
                <Text style={[styles.tabText, ink, tab === i && (ink ? styles.tabTextOnDark : styles.tabTextOn)]} numberOfLines={1}>
                  {t.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.status}>
            <Text style={[styles.sofaMode, ink]}>✦ Sofa mode</Text>
            <Text style={[styles.sofaMeta, ink]}>{novaLine(nova)}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export type RailEntry = {id: number; label: string};

// The page's own sections, named by Nova. ◀◀ ▶▶ walk them; the one you're in is lit.
export const Rail = ({kind, facts, entries, current, ask}: {kind: string; facts?: string | null; entries: RailEntry[]; current: number | null; ask?: string | null}) => {
  const ci = Math.max(0, entries.findIndex(e => e.id === current));
  const start = Math.max(0, Math.min(ci - 4, entries.length - 11));
  return (
    <View style={styles.rail}>
      <Text style={styles.railKicker}>ON THIS PAGE</Text>
      <Text style={styles.railKind}>
        {kind}
        {facts ? <Text style={styles.railFacts}>{'  ·  ' + facts}</Text> : null}
      </Text>
      <View style={styles.railList}>
        {start > 0 && <Text style={styles.railMore}>↑ {start} more</Text>}
        {entries.slice(start, start + 11).map(e => {
          const on = e.id === current;
          return (
            <View key={e.id} style={[styles.railRow, on && styles.railRowOn]}>
              <View style={[styles.railBar, on && styles.railBarOn]} />
              <Text style={[styles.railText, on && styles.railTextOn]} numberOfLines={2}>
                {e.label}
              </Text>
            </View>
          );
        })}
        {entries.length > start + 11 && <Text style={styles.railMore}>↓ {entries.length - start - 11} more</Text>}
      </View>
      {!!ask && (
        <View style={styles.railAsk}>
          <Text style={styles.railAskKey}>{KEY.menu} Ask this page</Text>
          <Text style={styles.railAskQ} numberOfLines={2}>
            “{ask}”
          </Text>
        </View>
      )}
    </View>
  );
};

export type Hint = [keys: string, label: string];

export const HintBar = ({hints}: {hints: Hint[]}) => (
  <View style={styles.hints} pointerEvents="none">
    {hints.map(([k, l]) => (
      <View key={k + l} style={styles.hint}>
        <Text style={styles.hintKeys}>{k}</Text>
        <Text style={styles.hintLabel}>{l}</Text>
      </View>
    ))}
  </View>
);

export type AskState =
  | {status: 'idle'}
  | {status: 'thinking'; question: string}
  | {status: 'answered'; question: string; answer: string | null; quotes: string[]; ms: number; simulated: boolean}
  | {status: 'refused'; question: string}
  | {status: 'error'; question: string};

// One list the remote walks: Nova's questions, then the answer's quotes, then the page's extras.
export type PanelItem = {kind: 'question' | 'quote' | 'pin' | 'phone'; text: string};

// Ask this page: Nova's questions about this page, a grounded answer whose quotes point at the page,
// and two hand-offs: add the site to Home as an app, continue on the phone.
export const AskPanel = ({items, ask, index, closed}: {items: PanelItem[]; ask: AskState; index: number; closed?: string | null}) => {
  const row = (it: PanelItem, i: number) => {
    const on = index === i;
    if (it.kind === 'quote') {
      return (
        <View key={'q' + it.text} style={[styles.quote, on && styles.rowOn]}>
          <Text style={[styles.quoteText, on && styles.rowTextOn]} numberOfLines={4}>
            “{it.text}”
          </Text>
          {on && <Text style={styles.quoteHint}>OK  Show me on the page</Text>}
        </View>
      );
    }
    const extra = it.kind === 'pin' || it.kind === 'phone';
    return (
      <View key={it.kind + it.text} style={[extra ? styles.extra : styles.question, on && styles.rowOn]}>
        <Text style={[extra ? styles.extraText : styles.questionText, on && styles.rowTextOn]} numberOfLines={2}>
          {it.text}
        </Text>
      </View>
    );
  };
  const questions = items.filter(it => it.kind === 'question');
  const quotes = items.filter(it => it.kind === 'quote');
  const extras = items.filter(it => it.kind === 'pin' || it.kind === 'phone');
  const at = (it: PanelItem) => items.indexOf(it);
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>✦ Ask this page</Text>
      <Text style={styles.panelSub}>Answers come only from this page, and show you where.</Text>
      {closed ? (
        <Text style={styles.panelDim}>{closed}</Text>
      ) : questions.length === 0 ? (
        <Pulse>
          <Text style={styles.panelDim}>✦ Nova is reading the page…</Text>
        </Pulse>
      ) : (
        questions.map(it => row(it, at(it)))
      )}
      {ask.status !== 'idle' && <View style={styles.divider} />}
      {ask.status === 'thinking' && (
        <Pulse>
          <Text style={styles.panelDim}>✦ Looking for it on the page…</Text>
        </Pulse>
      )}
      {ask.status === 'answered' && (
        <>
          {!!ask.answer && <Text style={styles.answer}>{ask.answer}</Text>}
          <Text style={styles.onPage}>ON THIS PAGE</Text>
          {quotes.map(it => row(it, at(it)))}
          <Text style={styles.panelMeta}>
            ✦ Nova{ask.simulated ? ' (simulated)' : ''} · {(ask.ms / 1000).toFixed(1)} s · every quote checked against the page
          </Text>
        </>
      )}
      {ask.status === 'refused' && (
        <>
          <Text style={styles.answer}>Not on this page.</Text>
          <Text style={styles.panelDim}>Sofa Surf only answers from what this page says, so it won't guess.</Text>
        </>
      )}
      {ask.status === 'error' && <Text style={styles.panelDim}>Nova didn't answer. Try again in a moment.</Text>}
      <View style={styles.extras}>{extras.map(it => row(it, at(it)))}</View>
      <Text style={styles.panelNote}>✦ Nova reads this page only for you. The site's ads, paywall and analytics are untouched.</Text>
    </View>
  );
};

export type ToolOffer = {name: string; title: string; description: string};

// The page offers an action (WebMCP). Nothing happens until the viewer says OK.
export const Confirm = ({tool, product}: {tool: ToolOffer; product?: {name: string; price: string | null; currency: string | null} | null}) => (
  <View style={styles.scrim}>
    <View style={styles.sheet}>
      <Text style={styles.sheetKicker}>✦ THIS PAGE OFFERS AN ACTION</Text>
      <Text style={styles.sheetTitle}>{tool.title}</Text>
      {!!product?.name && (
        <Text style={styles.sheetProduct}>
          {product.name}
          {product.price ? `   ${product.currency === 'USD' || !product.currency ? '$' : product.currency + ' '}${product.price.replace(/\.00$/, '')}` : ''}
        </Text>
      )}
      <Text style={styles.sheetDesc}>The site describes it as: “{tool.description}”</Text>
      <Text style={styles.sheetNote}>The site's own code will do it. Sofa Surf never acts without your OK.</Text>
      <View style={styles.sheetKeys}>
        <View style={[styles.hint, styles.sheetKeyMain]}>
          <Text style={[styles.hintKeys, styles.sheetKeyMainText]}>OK</Text>
          <Text style={[styles.hintLabel, styles.sheetKeyMainText]}>Confirm</Text>
        </View>
        <View style={styles.hint}>
          <Text style={styles.hintKeys}>{KEY.back}</Text>
          <Text style={styles.hintLabel}>Cancel</Text>
        </View>
      </View>
    </View>
  </View>
);

// Continue on your phone: the exact page, for sign-in, checkout or long typing.
export const PhoneSheet = ({url, title}: {url: string; title: string}) => (
  <View style={styles.scrim}>
    <View style={[styles.sheet, styles.phoneSheet]}>
      <Image source={{uri: `${BACKEND}/qr?u=${encodeURIComponent(url)}`}} style={styles.qr} />
      <View style={styles.phoneText}>
        <Text style={styles.sheetKicker}>CONTINUE ON YOUR PHONE</Text>
        <Text style={styles.phoneTitle} numberOfLines={3}>
          {title}
        </Text>
        <Text style={styles.sheetDesc}>Point your phone's camera at the code. The same page opens there, ready for signing in, paying or typing.</Text>
        <View style={styles.sheetKeys}>
          <View style={styles.hint}>
            <Text style={styles.hintKeys}>{KEY.back}</Text>
            <Text style={styles.hintLabel}>Done</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

// Above the hints, centred under the page: the site's own notices stay visible at the top.
export const Toast = ({text}: {text: string}) => (
  <View style={styles.toastRow} pointerEvents="none">
    <View style={styles.toast}>
      <Text style={styles.toastText}>{text}</Text>
    </View>
  </View>
);

const glass = 'rgba(21,27,38,0.97)';

const styles = StyleSheet.create(sized({
  top: {position: 'absolute', top: 0, left: 0, right: 0, height: FRAME.top, backgroundColor: C.bg},
  bar: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, gap: 28},
  appBar: {gap: 22},
  brand: {color: C.text, fontSize: 32, fontWeight: '800', width: 300},
  brandAccent: {color: C.accent},
  address: {flex: 1, backgroundColor: C.panel, borderRadius: 30, paddingVertical: 10, paddingHorizontal: 26},
  host: {color: C.text, fontSize: T.small, fontWeight: '700'},
  path: {color: C.dim, fontWeight: '400'},
  status: {alignItems: 'flex-end', minWidth: 420},
  statusAi: {color: C.accent, fontSize: T.small - 2, fontWeight: '700'},
  statusDim: {color: C.dim, fontSize: T.small - 4, fontWeight: '500'},
  icon: {width: 60, height: 60, borderRadius: 14},
  iconBlank: {backgroundColor: 'rgba(255,255,255,0.25)'},
  siteName: {color: '#FFFFFF', fontSize: 34, fontWeight: '800', maxWidth: 420},
  tabs: {flex: 1, flexDirection: 'row', gap: 10, marginLeft: 18},
  tab: {borderRadius: 26, paddingVertical: 10, paddingHorizontal: 22, backgroundColor: 'rgba(0,0,0,0.18)'},
  tabOn: {backgroundColor: '#FFFFFF'},
  tabText: {color: '#FFFFFF', fontSize: T.small - 2, fontWeight: '700'},
  tabTextOn: {color: C.bg},
  tabOnLight: {backgroundColor: 'rgba(0,0,0,0.06)'},
  tabOnDark: {backgroundColor: C.bg},
  tabTextOnDark: {color: '#FFFFFF'},
  sofaMode: {color: '#FFFFFF', fontSize: T.small - 2, fontWeight: '800'},
  sofaMeta: {color: 'rgba(255,255,255,0.8)', fontSize: T.small - 6, fontWeight: '600'},
  rail: {position: 'absolute', top: FRAME.top, left: 0, width: FRAME.left, bottom: 0, backgroundColor: C.bg, paddingHorizontal: 40, paddingTop: 24},
  railKicker: {color: C.dim, fontSize: T.small - 6, fontWeight: '800', letterSpacing: 2},
  railKind: {color: C.text, fontSize: T.small, fontWeight: '700', marginTop: 6, marginBottom: 18},
  railFacts: {color: C.accent, fontWeight: '600'},
  railList: {flex: 1, gap: 4},
  railMore: {color: C.dim, fontSize: T.small - 6, marginVertical: 4, marginLeft: 22},
  railRow: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8, paddingRight: 10, borderRadius: 10},
  railRowOn: {backgroundColor: C.panel},
  railBar: {width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: 'transparent'},
  railBarOn: {backgroundColor: C.accent},
  railText: {flex: 1, color: C.dim, fontSize: T.small - 2, lineHeight: 30},
  railTextOn: {color: C.text, fontWeight: '700'},
  railAsk: {borderTopWidth: 2, borderTopColor: C.panel, paddingTop: 18, paddingBottom: 30},
  railAskKey: {color: C.accent, fontSize: T.small - 4, fontWeight: '800', letterSpacing: 1},
  railAskQ: {color: C.text, fontSize: T.small - 2, fontStyle: 'italic', marginTop: 6, lineHeight: 30},
  hints: {position: 'absolute', left: FRAME.left, right: 0, bottom: 0, height: FRAME.bottom, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24},
  hint: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.panel, borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20},
  hintKeys: {color: C.accent, fontSize: T.small - 2, fontWeight: '800'},
  hintLabel: {color: C.text, fontSize: T.small - 2, fontWeight: '600'},
  panel: {position: 'absolute', top: FRAME.top, right: 0, bottom: FRAME.bottom, width: 720, backgroundColor: glass, borderLeftWidth: 3, borderLeftColor: C.accent, paddingHorizontal: 44, paddingTop: 30},
  panelTitle: {color: C.accent, fontSize: T.title - 10, fontWeight: '800'},
  panelSub: {color: C.dim, fontSize: T.small - 2, marginTop: 6, marginBottom: 20},
  panelDim: {color: C.dim, fontSize: T.small, marginTop: 10, lineHeight: 34},
  question: {borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.06)'},
  questionText: {color: C.text, fontSize: T.label - 2, fontWeight: '600'},
  rowOn: {backgroundColor: C.focus},
  rowTextOn: {color: C.bg},
  divider: {height: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16},
  answer: {color: C.text, fontSize: T.label + 2, fontWeight: '700', lineHeight: 42, marginBottom: 12},
  onPage: {color: C.dim, fontSize: T.small - 6, fontWeight: '800', letterSpacing: 2, marginBottom: 8},
  quote: {borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginBottom: 8, backgroundColor: 'rgba(255,181,71,0.10)', borderLeftWidth: 5, borderLeftColor: C.accent},
  quoteText: {color: C.text, fontSize: T.small, lineHeight: 34, fontStyle: 'italic'},
  quoteHint: {color: C.bg, fontSize: T.small - 6, fontWeight: '800', marginTop: 8},
  panelMeta: {color: C.dim, fontSize: T.small - 6, marginTop: 10},
  extras: {flexDirection: 'row', gap: 12, marginTop: 'auto', marginBottom: 12},
  extra: {flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)'},
  extraText: {color: C.text, fontSize: T.small - 2, fontWeight: '700'},
  panelNote: {color: C.dim, fontSize: T.small - 8, lineHeight: 24, marginBottom: 18},
  scrim: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,15,23,0.66)', alignItems: 'center', justifyContent: 'center'},
  sheet: {width: 900, backgroundColor: C.panel, borderRadius: 28, padding: 56, borderTopWidth: 4, borderTopColor: C.accent},
  sheetKicker: {color: C.accent, fontSize: T.small - 4, fontWeight: '800', letterSpacing: 2},
  sheetTitle: {color: C.text, fontSize: T.hero - 8, fontWeight: '800', marginTop: 10},
  sheetProduct: {color: C.text, fontSize: T.label + 4, fontWeight: '600', marginTop: 12},
  sheetDesc: {color: C.dim, fontSize: T.small, marginTop: 22, lineHeight: 34},
  sheetNote: {color: C.dim, fontSize: T.small - 4, marginTop: 10},
  sheetKeys: {flexDirection: 'row', gap: 18, marginTop: 36},
  sheetKeyMain: {backgroundColor: C.focus},
  sheetKeyMainText: {color: C.bg},
  phoneSheet: {width: 1100, flexDirection: 'row', gap: 48, alignItems: 'center'},
  qr: {width: 340, height: 340, borderRadius: 16, backgroundColor: '#FFFFFF'},
  phoneText: {flex: 1},
  phoneTitle: {color: C.text, fontSize: T.title - 6, fontWeight: '800', marginTop: 10, lineHeight: 52},
  toastRow: {position: 'absolute', bottom: FRAME.bottom + 24, left: FRAME.left, right: 0, alignItems: 'center'},
  toast: {backgroundColor: 'rgba(21,27,38,0.96)', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 30, borderWidth: 2, borderColor: 'rgba(255,181,71,0.5)'},
  toastText: {color: C.accent, fontSize: T.small - 2, fontWeight: '700'},
}));
