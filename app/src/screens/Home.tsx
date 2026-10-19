import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {meta, site, type Meta} from '../api';
import {Billboard, Pill, Shelf, Tile} from '../ui/tv';
import {C, T, sized} from '../ui/theme';
import type {Consent} from './LiveChrome';
import type {App} from './LivePage';

// Sites on Home, like apps. These three are fictional (the demo video can't show real brands);
// "Add to Home" in any site's ≡ panel puts that site first.
export const DEFAULT_APPS: App[] = [
  {url: site('linas-kitchen/'), name: "Lina's Kitchen", color: '#C8553D', icon: site('linas-kitchen/icon-512.png')},
  {url: site('cedar-and-pine/'), name: 'Cedar & Pine', color: '#2F5D46', icon: site('cedar-and-pine/icon-512.png')},
  {url: site('harbor-daily/'), name: 'Harbor Daily', color: '#0F2A3D', icon: site('harbor-daily/icon-512.png')},
];

// Real sites. Hidden when filming: the video must not show third-party brands.
const SHOW_WEB = true;
const WEB = [
  {label: 'Wikipedia: Fire TV', url: 'https://en.wikipedia.org/wiki/Fire_TV'},
  {label: 'BBC News', url: 'https://www.bbc.com/news'},
];

export type Visit = {url: string; title: string; site: string};

// What the viewer typed: an address, or words to search for.
const address = (typed: string) => {
  const t = typed.trim();
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(t) ? `https://${t}` : `https://duckduckgo.com/html/?q=${encodeURIComponent(t)}`;
};
const hostOf = (url: string) => {
  const demo = url.match(/\/sites\/([^/]+)\//);
  return demo ? `${demo[1].replace(/-/g, '')}.demo` : url.split('/')[2]?.replace(/^www\./, '') ?? '';
};

export const Home = ({apps, last, consent, onConsent, onOpen}: {apps: App[]; last: Visit | null; consent: Consent; onConsent: (c: Consent) => void; onOpen: (url: string) => void}) => {
  // Each site's own share image (og:image) makes its tile, like an app's artwork.
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const urls = [...apps.map(a => a.url), ...(SHOW_WEB ? WEB.map(w => w.url) : []), ...(last ? [last.url] : [])];
  useEffect(() => {
    for (const u of urls) {
      if (!metas[u]) {
        meta(u)
          .then(m => setMetas(all => ({...all, [u]: m})))
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join(' ')]);
  const [typed, setTyped] = useState('');

  const hero = last ? metas[last.url]?.image : metas[apps[0]?.url]?.image;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Billboard image={hero} kicker="SOFA SURF" title="Where to?" subtitle="Every website, made for your remote.">
        {last ? (
          <Pill label={`▶︎  Continue: ${last.title.split(/ [|–-] /)[0]}`} preferred onPress={() => onOpen(last.url)} />
        ) : (
          <Pill label={`▶︎  Open ${apps[0]?.name ?? 'a website'}`} preferred onPress={() => apps[0] && onOpen(apps[0].url)} />
        )}
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={setTyped}
          placeholder="Type a website or search"
          placeholderTextColor={C.dim}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => typed.trim() && onOpen(address(typed))}
        />
      </Billboard>
      <Shelf title="Your apps">
        {apps.map(a => (
          <Tile key={a.url} title={a.name} image={metas[a.url]?.image} caption={hostOf(a.url)} onPress={() => onOpen(a.url)} />
        ))}
      </Shelf>
      {SHOW_WEB && (
        <Shelf title="On the web">
          {WEB.map(s => (
            <Tile key={s.url} title={s.label} image={metas[s.url]?.image} caption={hostOf(s.url)} onPress={() => onOpen(s.url)} />
          ))}
        </Shelf>
      )}
      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>Cookies on websites</Text>
        <Text style={styles.settingsText}>
          Sofa Surf answers cookie banners for you with each site's own buttons, so they don't fill your TV.
        </Text>
        <Pill
          label={consent === 'necessary' ? 'Necessary only  ·  change' : 'Accept all  ·  change'}
          onPress={() => onConsent(consent === 'necessary' ? 'all' : 'necessary')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create(sized({
  page: {flex: 1, backgroundColor: C.bg},
  content: {paddingBottom: 100},
  input: {minWidth: 620, backgroundColor: 'rgba(255,255,255,0.10)', color: C.text, fontSize: T.label, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 26, borderWidth: 3, borderColor: 'transparent'},
  settings: {marginHorizontal: 96, marginTop: 10, gap: 14, alignItems: 'flex-start'},
  settingsTitle: {color: C.text, fontSize: T.label + 4, fontWeight: '700'},
  settingsText: {color: C.dim, fontSize: T.small, maxWidth: 1100},
}));
