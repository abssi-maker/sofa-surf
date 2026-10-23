// The real web page in a Vega WebView, made remote-native. Tier 1: the injected
// script maps the page in well under a second and takes over the D-pad and media
// keys. Tier 2: Nova refines that map (names, parts to skip) once per page.
// Around the page: Sofa mode (the site's own app bar and tabs), the sections rail, the hints,
// Ask this page (≡), and sheets for actions the page offers (WebMCP) and for the phone.
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {WebView} from '@amazon-devices/webview';
import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {ask as askPage, beacon, refine, type Refinement} from '../api';
import {INJECT} from '../live/inject';
import {backClaim} from '../ui/back';
import {C, px} from '../ui/theme';
import type {Step} from './Cook';
import {
  AskPanel,
  type AskState,
  Confirm,
  type Consent,
  FRAME,
  frameScript,
  type Hint,
  HintBar,
  KEY,
  type NovaState,
  type PanelItem,
  PhoneSheet,
  Rail,
  type RailEntry,
  type Site,
  Toast,
  type ToolOffer,
  TopBar,
} from './LiveChrome';

type Stop = {id: number; kind: string; label: string; x: number; y: number; w: number; h: number};
type Actions = {play: string | null; tool: string | null; skip: string};
type PageMap = {
  final: boolean;
  ms: number;
  type: string;
  title: string;
  actions: Actions;
  recipe: {name: string; steps: string[]} | null;
  product: {name: string; price: string | null; currency: string | null} | null;
  stops: Stop[];
  text: string | null;
  noai?: boolean;
  paywall?: boolean;
};
export type App = {url: string; name: string; color: string | null; icon: string | null};

// Sofa Surf says who it is to every site (a Chrome-class engine, plus its own token), never a disguise.
export const USER_AGENT = 'Mozilla/5.0 (Linux; Vega OS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 SofaSurf/1.0';

// What OK does on the focused stop (mirrors the injected script).
const OK: Record<string, string> = {title: 'Read from here', section: 'Read from here', ingredients: 'Read from here', steps: 'Read from here', search: 'Type', next: 'Next page', cart: 'Add to cart', video: 'Play'};
// The parts of a page the rail lists (the injected script's MAJOR).
const MAJOR = new Set(['title', 'section', 'ingredients', 'steps', 'video']);
const KIND: Record<string, string> = {recipe: 'Recipe', article: 'Article', listing: 'Front page', product: 'Product', video: 'Video'};
// Sofa mode takes over once Nova has refined the page, or after this long anyway.
const SOFA_AFTER_MS = 3500;

// On load, report what the early injection did, make sure it has started, or inject it now.
const lateInject = (consent: Consent) => `${frameScript(consent)}(function () {
  var ck = window.__clicker, p = {t: 'probe', early: !!ck, ready: document.readyState};
  if (ck) {
    p.ran = ck.ran;
    try { ck.flush(); } catch (e) { p.flushError = String(e); }
    try { ck.boot(); } catch (e) { p.bootError = String(e); }
    p.stops = ck.stops.length;
    p.errors = ck.errors;
  }
  try { window.ReactNativeWebView.postMessage(JSON.stringify(p)); } catch (e) {}
})();
${INJECT}`;

const run = (web: any, js: string) => web.current?.injectJavaScript(`(function(){var ck=window.__clicker; if(ck){${js}}})(); true;`);

// `covered`: another screen (Cook mode) is on top; the page stays loaded and keeps still underneath.
export const LivePage = ({
  url,
  consent,
  onCook,
  onPin,
  onVisit,
  covered,
}: {
  url: string;
  consent: Consent;
  onCook: (title: string, steps: Step[]) => void;
  onPin: (app: App) => void;
  onVisit: (visit: {url: string; title: string; site: string}) => void;
  covered?: boolean;
}) => {
  const web = useRef<any>(null);
  const t0 = useRef(Date.now());
  const at = () => Date.now() - t0.current;

  const [current, setCurrent] = useState(url); // the page the WebView is on now (links, tabs)
  const [page, setPage] = useState<PageMap | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [actions, setActions] = useState<Actions | null>(null);
  const [nova, setNova] = useState<Refinement | null>(null);
  const [novaState, setNovaState] = useState<NovaState>({status: 'reading'});
  const [mode, setMode] = useState<'browser' | 'app'>('browser');
  const [mapMs, setMapMs] = useState<number | undefined>();
  const [focus, setFocus] = useState<{kind: string; section: number | null} | null>(null);
  const [marked, setMarked] = useState(false);
  const [tab, setTab] = useState<number | null>(null);
  const [panel, setPanel] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AskState>({status: 'idle'});
  const [confirm, setConfirm] = useState<ToolOffer | null>(null);
  const [phone, setPhone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refined = useRef<string | null>(null);

  const say = (text: string, ms = 3200) => {
    setToast(text);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  // The page keeps still while Sofa Surf's own layers have the remote.
  const native = panel || !!confirm || phone || tab !== null || !!covered;
  useEffect(() => {
    run(web, `ck.paused = ${native};`);
  }, [native]);

  // Sofa mode: once Nova has refined the page (or after a few seconds), the site's own app bar takes over.
  useEffect(() => {
    if (mode === 'app' || !site) {
      return;
    }
    if (novaState.status !== 'reading') {
      setMode('app');
      return;
    }
    const t = setTimeout(() => setMode('app'), SOFA_AFTER_MS);
    return () => clearTimeout(t);
  }, [site, novaState, mode]);

  const noAi = page?.noai ? 'This site has turned off AI features on its pages. Sofa Surf still shows it, without Nova.' : null;
  const walled = page?.paywall ? 'This page is for subscribers. Sofa Surf won\'t read it for you: sign in on your phone to read it here.' : null;
  const questions = noAi || walled ? [] : nova?.questions ?? [];
  const quotes = answer.status === 'answered' ? answer.quotes : [];
  const siteName = site?.name ?? '';
  const items: PanelItem[] = [
    ...questions.map(text => ({kind: 'question' as const, text})),
    ...quotes.map(text => ({kind: 'quote' as const, text})),
    ...(siteName ? [{kind: 'pin' as const, text: `Add ${siteName} to Home`}] : []),
    {kind: 'phone' as const, text: 'Continue on your phone'},
  ];

  const openPanel = () => {
    setPanel(true);
    setIndex(0);
    beacon({t: 'panel', at: at(), on: true});
  };
  const closePanel = () => {
    setPanel(false);
    beacon({t: 'panel', at: at(), on: false});
  };

  const askQuestion = (question: string) => {
    const text = page?.text;
    if (!text) {
      say('✦ Still reading the page…');
      return;
    }
    setAnswer({status: 'thinking', question});
    const started = Date.now();
    askPage(current, question, text, page?.title ?? '')
      .then(r => {
        const ms = Date.now() - started;
        if (r.grounded && r.quotes.length) {
          setAnswer({status: 'answered', question, answer: r.answer, quotes: r.quotes, ms, simulated: r.simulated});
          setIndex(questions.length); // straight to the first quote
        } else {
          setAnswer({status: 'refused', question});
        }
        beacon({t: 'answer', at: at(), ms, question, grounded: r.grounded, quotes: r.quotes, answer: r.answer});
      })
      .catch(e => {
        setAnswer({status: 'error', question});
        beacon({t: 'askError', at: at(), error: String(e?.message ?? e)});
      });
  };

  // A quote is the way back into the page: close the panel, scroll there, highlight it.
  const showQuote = (quote: string) => {
    closePanel();
    run(web, `ck.show(${JSON.stringify(quote)});`);
  };

  const choose = (it: PanelItem | undefined) => {
    if (!it) {
      return;
    }
    if (it.kind === 'question') {
      askQuestion(it.text);
    } else if (it.kind === 'quote') {
      showQuote(it.text);
    } else if (it.kind === 'pin' && site) {
      onPin({url: current, name: site.name, color: site.color, icon: site.icon});
      say(`✦  ${site.name} is on your Home screen, like any app`);
      beacon({t: 'pin', at: at(), site: site.name});
    } else if (it.kind === 'phone') {
      closePanel();
      setPhone(true);
      beacon({t: 'phone', at: at(), url: current});
    }
  };

  const doConfirm = () => {
    if (!confirm) {
      return;
    }
    const tool = confirm;
    setConfirm(null);
    run(web, `ck.callTool(${JSON.stringify(tool.name)}, {});`);
    beacon({t: 'toolConfirmed', at: at(), tool: tool.name});
  };

  const openTab = (i: number) => {
    const target = site?.tabs[i];
    setTab(null);
    if (target) {
      beacon({t: 'tab', at: at(), label: target.label, href: target.href});
      run(web, `location.href = ${JSON.stringify(target.href)};`);
    }
  };

  // The remote, while Sofa Surf's own layers are open (the page has it otherwise).
  const keys = useRef<(type: string) => void>(() => {});
  keys.current = (type: string) => {
    if (covered || phone) {
      return;
    }
    if (type === 'menu') {
      if (confirm) {
        return;
      }
      setTab(null);
      if (panel) {
        closePanel();
      } else {
        openPanel();
      }
      return;
    }
    if (confirm) {
      if (type === 'select') {
        doConfirm();
      }
      return;
    }
    if (tab !== null) {
      const n = site?.tabs.length ?? 0;
      if (type === 'left') {
        setTab(t => Math.max(0, (t ?? 0) - 1));
      } else if (type === 'right') {
        setTab(t => Math.min(n - 1, (t ?? 0) + 1));
      } else if (type === 'down') {
        setTab(null);
      } else if (type === 'select') {
        openTab(tab);
      }
      return;
    }
    if (!panel) {
      return;
    }
    if (type === 'up') {
      setIndex(i => Math.max(0, i - 1));
    } else if (type === 'down') {
      setIndex(i => Math.min(items.length - 1, i + 1));
    } else if (type === 'left' || type === 'right') {
      // The two hand-offs sit side by side at the bottom.
      const it = items[index];
      if (it && (it.kind === 'pin' || it.kind === 'phone')) {
        const other = items.findIndex(x => x.kind === (it.kind === 'pin' ? 'phone' : 'pin'));
        if (other >= 0) {
          setIndex(other);
        }
      }
    } else if (type === 'select') {
      choose(items[index]);
    }
  };
  useTVEventHandler((evt: {eventType: string; eventKeyAction?: number}) => {
    if (evt.eventKeyAction === 1) {
      return;
    }
    keys.current(evt.eventType === 'enter' ? 'select' : evt.eventType);
  });

  // Back closes the newest layer first: confirm, phone, panel, tabs, quote; then it leaves the page.
  const layers = useRef({covered: false, confirm: false, phone: false, panel: false, tab: false, marked: false});
  layers.current = {covered: !!covered, confirm: !!confirm, phone, panel, tab: tab !== null, marked};
  useEffect(() => {
    backClaim.current = () => {
      const l = layers.current;
      if (l.covered) {
        return false;
      }
      if (l.confirm) {
        setConfirm(null);
        say('Cancelled. Nothing was changed.');
        return true;
      }
      if (l.phone) {
        setPhone(false);
        return true;
      }
      if (l.panel) {
        closePanel();
        return true;
      }
      if (l.tab) {
        setTab(null);
        return true;
      }
      if (l.marked) {
        run(web, 'ck.unmark();');
        return true;
      }
      return false;
    };
    return () => {
      backClaim.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const novaRefine = (m: PageMap, pageUrl: string) => {
    refined.current = pageUrl;
    if (m.noai) {
      setNovaState({status: 'off', why: 'Nova off at the site\'s request'});
      return;
    }
    const started = Date.now();
    refine(pageUrl, {type: m.type, title: m.title, recipe: m.recipe, stops: m.stops})
      .then(r => {
        run(web, `ck.refine(${JSON.stringify(r)});`);
        const ms = Date.now() - started;
        setNova(r);
        setNovaState({status: 'done', ms, simulated: r.simulated, parts: m.stops.length - r.hide.length});
        beacon({t: 'refined', at: at(), ms, hidden: r.hide.length, questions: r.questions});
      })
      .catch(e => {
        setNovaState({status: 'off'});
        beacon({t: 'refineError', at: at(), error: String(e?.message ?? e)});
      });
  };

  const onMessage = (e: {nativeEvent: {data: string}}) => {
    let m: any;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (m.t) {
      case 'map': {
        const pageUrl = m.url || current;
        if (pageUrl !== current) {
          // A link or a tab took the WebView to another page of the site: start over on it.
          setCurrent(pageUrl);
          setNova(null);
          setNovaState({status: 'reading'});
          setAnswer({status: 'idle'});
          setMarked(false);
        }
        setPage(m);
        setActions(m.actions);
        setMapMs(t => t ?? at());
        const kinds: Record<string, number> = {};
        m.stops.forEach((s: Stop) => (kinds[s.kind] = (kinds[s.kind] ?? 0) + 1));
        beacon({t: 'map', at: at(), url: pageUrl, final: m.final, ms: m.ms, type: m.type, viewport: m.viewport, actions: m.actions, stops: m.stops.length, kinds, tools: m.tools?.length, textChars: m.text?.length, noai: m.noai, paywall: m.paywall});
        if (m.final && refined.current !== pageUrl) {
          novaRefine(m, pageUrl);
          onVisit({url: pageUrl, title: m.title, site: site?.name ?? ''});
        }
        break;
      }
      case 'site':
        setSite({name: m.name, color: m.color, icon: m.icon, tabs: m.tabs ?? []});
        beacon({t: 'site', at: at(), from: m.from, name: m.name, color: m.color, icon: m.icon, tabs: (m.tabs ?? []).map((x: {label: string}) => x.label)});
        break;
      case 'focus':
        setFocus({kind: m.kind, section: m.section});
        beacon({t: 'focus', at: at(), kind: m.kind, label: m.label, section: m.section});
        break;
      case 'edge':
        // ↑ past the top of the page: the remote moves up to the site's tabs.
        if (mode === 'app' && site?.tabs.length) {
          setTab(0);
        }
        break;
      case 'clean': {
        const consentNote = (m.what ?? []).some((w: string) => w.includes('refused'))
          ? ' · cookies: necessary only'
          : (m.what ?? []).some((w: string) => w.includes('accepted'))
            ? ' · cookies: accepted'
            : '';
        say(`✦  Closed ${m.closed} pop-up${m.closed > 1 ? 's' : ''}${consentNote}`);
        beacon({t: 'clean', at: at(), closed: m.closed, ms: m.ms, what: m.what});
        break;
      }
      case 'paywall':
        beacon({t: 'paywall', at: at()});
        break;
      case 'mark':
        setMarked(m.on);
        if (m.section !== undefined && m.section !== null) {
          setFocus(f => ({kind: f?.kind ?? 'section', section: m.section}));
        }
        if (m.on) {
          say('✦  Here it is, on the page');
        } else if (m.found === false) {
          say("Couldn't find that sentence on the page");
        }
        beacon({t: 'mark', at: at(), on: m.on, found: m.found});
        break;
      case 'tools':
        if (m.actions) {
          setActions(m.actions);
        }
        beacon({t: 'tools', at: at(), tools: m.tools.map((x: ToolOffer) => x.name)});
        break;
      case 'toolResult':
        say(m.ok ? `✓  ${m.text}` : `The page couldn't do it: ${m.text}`, 4500);
        beacon({t: 'toolResult', at: at(), name: m.name, ok: m.ok, text: m.text});
        break;
      case 'action': {
        const recipe = page?.recipe;
        if (m.action === 'cook' && recipe?.steps.length) {
          onCook(recipe.name, recipe.steps.map((text, i) => ({n: i + 1, text})));
        } else if (m.action === 'tool' && m.tool) {
          setConfirm(m.tool);
        } else {
          say('Nothing to play on this page');
        }
        beacon({t: 'action', at: at(), action: m.action, tool: m.tool?.name});
        break;
      }
      default:
        beacon({at: at(), ...m});
    }
  };

  // The rail: the page's big parts, minus what Nova skipped, in Nova's words.
  const hidden = new Set(nova?.hide ?? []);
  const entries: RailEntry[] = (page?.stops ?? [])
    .filter(s => MAJOR.has(s.kind) && !hidden.has(s.id))
    .map(s => ({id: s.id, label: (nova?.labels as Record<string, string> | undefined)?.[String(s.id)] ?? s.label}))
    .filter(e => e.label);
  const type = nova?.type ?? page?.type ?? 'article';
  const facts = page?.paywall
    ? 'for subscribers'
    : page?.recipe?.steps.length
      ? `${page.recipe.steps.length} steps`
      : page?.product?.price
        ? `$${page.product.price.replace(/\.00$/, '')}`
        : null;

  const hints: Hint[] = confirm
    ? [[KEY.ok, 'Confirm'], [KEY.back, 'Cancel']]
    : phone
      ? [[KEY.back, 'Done']]
      : panel
        ? [[KEY.updown, 'Choose'], [KEY.ok, items[index]?.kind === 'quote' ? 'Show on page' : items[index]?.kind === 'question' ? 'Ask' : 'Select'], [KEY.back, 'Close']]
        : tab !== null
          ? [[KEY.sides, `${siteName} sections`], [KEY.ok, 'Open'], ['▼', 'Back to the page']]
          : marked
            ? [[KEY.updown, 'Keep reading'], [KEY.back, 'Clear highlight'], [KEY.menu, 'Ask another']]
            : ([
                actions?.play ? [KEY.play, actions.play] : null,
                [KEY.skip, actions?.skip ?? 'Sections'],
                focus ? [KEY.ok, OK[focus.kind] ?? 'Open'] : null,
                [KEY.menu, 'Ask this page'],
              ].filter(Boolean) as Hint[]);

  // Demo sites live on the Mac's backend; the address bar shows their own (clearly fictional) names.
  const demo = current.match(/\/sites\/([^/]+)\/(.*)$/);
  const parts = current.split('/');
  const host = demo ? `${demo[1].replace(/-/g, '')}.demo` : parts[2]?.replace(/^www\./, '') ?? '';
  const path = demo ? (demo[2] ? '/' + demo[2] : '') : '/' + parts.slice(3).join('/');
  return (
    <View style={styles.page}>
      <WebView
        ref={web}
        style={styles.web}
        source={{uri: url}}
        userAgent={USER_AGENT}
        hasTVPreferredFocus
        javaScriptEnabled
        injectedJavaScriptBeforeContentLoaded={frameScript(consent) + INJECT}
        onMessage={onMessage}
        onLoadStart={() => beacon({t: 'loadStart', at: at()})}
        onLoad={() => {
          beacon({t: 'load', at: at()});
          web.current?.injectJavaScript(lateInject(consent));
        }}
      />
      <TopBar mode={mode} host={host} path={path.length > 1 ? path : ''} nova={novaState} mapMs={mapMs} site={site} tab={tab} />
      <Rail kind={KIND[type] ?? 'Page'} facts={facts} entries={entries} current={focus?.section ?? null} ask={questions[0]} />
      <HintBar hints={hints} />
      {panel && <AskPanel items={items} ask={answer} index={index} closed={noAi ?? walled} />}
      {confirm && <Confirm tool={confirm} product={page?.product} />}
      {phone && <PhoneSheet url={current} title={page?.title ?? siteName} />}
      {toast && <Toast text={toast} />}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: C.bg},
  web: {position: 'absolute', top: px(FRAME.top), left: px(FRAME.left), right: 0, bottom: px(FRAME.bottom), backgroundColor: '#FFFFFF'},
});
