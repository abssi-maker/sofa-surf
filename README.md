# Sofa Surf — surf the web from your sofa

**Every website becomes its own Fire TV app.** Sofa Surf is a web browser for Fire TV (Vega OS). It shows the publisher's real page, and Amazon Nova makes that page work from the remote: focus on the page's real parts, Ask this page, Cook mode. Ads and paywalls stay.

Built for the Amazon "Build, Ship, Shape" hackathon (Fire TV track).

## What it does
- **Sofa mode.** While Nova reads the page, Sofa Surf's address bar shows. Then it cross-fades into the site's own app bar: icon, name and colour from its web app manifest, and its menu as TV tabs. One press adds the site to Home, like any app.
- **The D-pad moves between the page's real parts:** titles, sections, products, stories, with an "On this page" rail. ◀◀ ▶▶ go section to section or page to page. OK reads from here, or opens.
- **Pop-ups gone, ads kept.** Newsletter, sign-up and chat prompts that cover the page are closed. Ads are never touched.
- **Ask this page (≡ Menu).** Nova suggests three questions about the page and answers only from the page's own text. OK on a quote scrolls to it and highlights it. If the page doesn't say, the answer is "Not on this page".
- **Cook mode (▶❚❚ on a recipe).** One step per screen, with a timer read from the step's text. Back returns to the same spot on the page.
- **Site actions through WebMCP.** On a shop, ▶❚❚ runs a tool the site declares with `navigator.modelContext` (such as Add to cart), after a confirm sheet. The site's own code does the work.
- **Paywalls stand.** Ask won't read behind a subscriber wall.
- **Continue on your phone.** A QR code opens the same page on the phone.

## For site owners
| A site can… | How |
|---|---|
| Get a Fire TV app with no work | Its manifest, meta tags and menu already become the app |
| Look its best | A web app manifest (name, icons, `theme_color`), schema.org (Recipe, Product, Article), CSS for `html[data-sofasurf]` |
| Offer actions on the remote | WebMCP tools; the viewer confirms each one |
| See its TV traffic | The user agent says `SofaSurf/1.0` |
| Turn the AI off | `<meta name="sofasurf" content="noai">` |

Nova reads a page only when a viewer opens it, for that viewer. Sofa Surf never crawls, never replaces the page with a summary, never hides ads and never bypasses paywalls. More in [STRATEGY.md](STRATEGY.md).

## How it's built
```
app/                         React Native for Vega 0.83 (Vega SDK 0.24), @amazon-devices/webview 4.0.2
  src/App.tsx                screen stack and session state (cookie choice, apps on Home, last visit)
  src/live/inject.ts         runs in every page: focus stops and focus engine, pop-up clean-up,
                             paywall check, site identity, WebMCP shim, quote finder and highlighter
  src/screens/LivePage.tsx   Sofa mode, tabs, Ask, sheets, Back order, Nova calls
  src/screens/LiveChrome.tsx app bar, rail, hint bar, Ask panel, confirm and phone sheets
  src/screens/Home.tsx       "Where to?", Continue, address box, Your apps
  src/screens/Cook.tsx       Cook mode with timer
server/                      FastAPI on :8788
  server.py                  /meta, /img, /refine, /ask, /qr, /sites (the demo sites)
  ground.py                  the grounding rule: quotes word for word, numbers must be in a quote
  nova_api.py, nova_mock.py  Amazon Nova 2 Lite (Nova API) and a rule-based offline stand-in
  sites/                     three fictional demo sites: a recipe blog, a shop with WebMCP tools,
                             a local newspaper with a paywall
tools/                       backend, build-install-launch cycle, remote keys, screenshots, events
```

The demo sites are fictional, made for this project, so the demo shows no third-party brands.

## Run it
Needs the Vega SDK with the Vega Virtual Device, [uv](https://docs.astral.sh/uv/) and an Amazon Nova API key (https://nova.amazon.com/dev-apis).

```sh
cp server/.env.example server/.env        # paste NOVA_API_KEY
tools/backend.sh &                        # backend on :8788 (real Nova); log in /tmp/sofasurf-backend.log
cd server && uv run pytest -q             # 12 tests
cd ../app && npm install
../tools/cycle.sh                         # typecheck, release build, install, launch on the Virtual Device
../tools/key.sh MENU ENTER                # drive the remote
```
The Virtual Device reaches the Mac at `10.0.2.2:8788` (`app/src/api.ts`). Without a key, the server uses the rule-based offline stand-in instead of Nova.

## Friction log
[FRICTION.md](FRICTION.md): 14 findings about Vega's OS ↔ app ↔ WebView boundary and tooling, with a top-5 list for the next Vega version.

## License
MIT, see [LICENSE](LICENSE).
