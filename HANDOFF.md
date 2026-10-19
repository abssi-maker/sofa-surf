# Handoff: Sofa Surf (Fire TV hackathon), as of Oct 19, 2026 (evening)

Read this first, then `STRATEGY.md` (why and for whom), `REVIEW.md` (judge's review, open items) and `FRICTION.md`.
The code folder is still `clicker/` and the package id `com.clicker.app`; only the visible name changed.

## The competition
- Amazon **"Build, Ship, Shape"** on Devpost, **Fire TV track**. **Deadline: Fri Oct 23, 2026, 12:00 PDT (19:00 UTC).** Judging Nov 9–20.
- Criteria, equal weight (ties broken in this order): **Tech Implementation → Design → Potential Impact → Quality of Idea**. Judges may judge from the **3-minute video** and the text alone.
- **Judges listed:** Amazon Devices and Fire TV leadership, Fire TV Voice & AI, Alexa, Bee, Ring, AWS, Callstack (Vega OS partner), and an NBA product manager. No web publishers.
- **Friction log:** up to **+10%**. Fields per entry: task, steps, expected vs actual, severity, workaround, suggestion.
- **The video must not show third-party trademarks or copyrighted material.** It must show a real Fire TV device or the Vega simulator. Film only on our fictional sites, with `SHOW_WEB = false` in `Home.tsx`.
- **Mini-challenges:** AWS Builder (Bedrock, AgentCore, Strands…; "Bedrock + AgentCore + Strands" is the *creative* tier) and Open Source.

## The product: Sofa Surf, "Surf the web from your sofa"
- **A browser, not an answer engine:** the real page in a Vega WebView; AI makes it work from the remote and points into the page, never replaces it.
- **Sofa mode: every website becomes its own Fire TV app.**
  - Sofa Surf's address bar shows while Nova reads the page, then cross-fades to the site's own app bar: icon, name, colour from its web app manifest (else meta tags), and its menu as TV tabs (↑ from the top of the page).
  - The page is laid out 1024 CSS px wide × 1.5 (its own tablet layout).
- **Remote:**
  - D-pad: focus on the page's real parts.
  - OK: read from here, or open.
  - ◀◀ ▶▶: sections, or pages.
  - ▶❚❚: Cook mode on a recipe, or a WebMCP tool the site declares (confirm sheet).
  - ≡: Ask this page.
  - Back: closes the newest layer, then leaves the page.
- **Ask this page:** Nova's 3 practical questions, then a grounded answer (`server/ground.py`). OK on a quote scrolls the page there and highlights it. The panel also holds **Add to Home** and **Continue on your phone** (a QR code).
- **Cook mode:** one step per screen, with a timer from the step's own text. The live page stays loaded underneath, so Back returns to the same spot.
- **Rules with publishers (enforced in code, see `STRATEGY.md`):**
  - **Ads are never touched.**
  - **Paywalls stand,** and Ask won't read behind them.
  - **Cookies:** the viewer chooses once on Home, and the choice is pressed with the site's own buttons.
  - **Sofa Surf identifies itself:** the user agent says `SofaSurf/1.0`.
  - **Sites can opt out of the AI:** `<meta name="sofasurf" content="noai">` turns Nova off; `html[data-sofasurf]` is set for site styling.
  - **Actions only through tools the site declares,** after the viewer's OK.
- **Only Amazon models (Nova).** Real Nova 2 Lite runs through the Nova API; Bedrock comes once the AWS account activates.

## Code
```
clicker/
  app/                         React Native for Vega 0.83 (Vega SDK 0.24, @amazon-devices/webview 4.0.2)
    manifest.toml              title "Sofa Surf"; cleartext allowed for "*" (a browser; demo sites are http)
    src/App.tsx                screen stack, session state (cookie choice, apps on Home, last visit)
    src/live/inject.ts         runs in every page: viewport, map of "stops", focus engine + ring, keys,
                               pop-up clean-up (consent, sign-up, chat; never ads or paywalls), paywall check,
                               site identity (manifest, meta, nav tabs), WebMCP shim (navigator.modelContext),
                               quote finder/highlighter, page text for Ask, CK.refine()
    src/screens/LivePage.tsx   behaviour: Sofa mode switch, tabs, Ask, sheets, Back order, Nova calls, beacons
    src/screens/LiveChrome.tsx look: top bars, rail, hint bar (text glyphs), Ask panel, confirm + phone sheets, toast
    src/screens/Home.tsx       "Where to?", Continue, address box, Your apps, On the web, cookie choice
    src/screens/Cook.tsx       Cook mode with timer
  server/                      FastAPI on :8788
    server.py                  /health (beacon), /meta, /img, /refine, /ask, /qr, /sites (static demo sites)
    ground.py                  the grounding rule (quotes word for word; short facts with a number; answer numbers in quotes)
    nova_api.py, nova_mock.py  real Nova 2 Lite (Nova API) and the rule-based stand-in (refine + ask)
    sites/                     Lina's Kitchen (+ recipes page), Cedar & Pine (+ living-room page, WebMCP tools),
                               Harbor Daily (front page, page 2, ferry article, subscriber story `council.html`);
                               each with a web app manifest, icon, cover.jpg, SVG art (no photos)
    .env                       NOVA_API_KEY. NEVER print or log it.
  tools/                       key.sh, shot.sh, backend.sh, events.sh, cycle.sh (see below)
  STRATEGY.md                  publishers, Amazon, TV browser landscape, the deal
  REVIEW.md                    judge's review, batch 1 results, open items #13, #15, #22–26
  FRICTION.md                  14 Vega entries + top-5 asks for the next Vega version
  design-prompt.md             brief for a design LLM (current layout, Sofa mode, vocabulary)
```

## How to run and test
```sh
clicker/tools/backend.sh &                          # real Nova; access log in /tmp/sofasurf-backend.log
cd clicker/server && uv run pytest -q               # 12 tests
source ~/vega/env && cd clicker/app && npx tsc --noEmit -p . && npx jest --forceExit   # 1 test
clicker/tools/cycle.sh                              # build (VVD stopped), install, launch, open the Home pill, print events
clicker/tools/key.sh MENU ENTER; clicker/tools/shot.sh ask   # drive the remote, screenshot
```
- **Restart the backend after changing prompts:** `/refine` and `/ask` are cached in memory per URL.
- **Events:** a healthy page sends `map` (twice) → `site` (page, then manifest) → `focus` → `probe` → `refined`. Others: `clean` (what it closed and why), `paywall`, `answer`, `mark`, `action`, `toolResult`, `pin`, `phone`, `back`.
- **No DevTools on the Virtual Device** (friction #4): debug the page script with `postMessage` probes.
- The Virtual Device reaches the Mac at `10.0.2.2:8788`; a phone scanning the QR code gets the Mac's Wi-Fi address. **The stick (192.168.8.152) is on another network than the Mac (192.168.3.x): nothing has run on real hardware yet.**
- In zsh scripts, don't name a variable `path`.

## Verified (Virtual Device, release build, real Nova 2 Lite, Oct 19)
| Site | Remote ready | Nova refine | What was seen |
|---|---|---|---|
| Lina's Kitchen | ~1.5 s | 2.8–2.9 s | Sofa mode bar + 4 tabs; newsletter closed as it opened; sticky ad kept; Ask "How many minutes to cook?" → "25 minutes" with quote, highlighted on the page; Cook mode timer; Add to Home; QR; Back to Home with "Continue" |
| Cedar & Pine | ~2.2 s | 4.4 s | Sofa mode bar + 3 tabs; chat bubble closed; WebMCP `add_to_cart` → confirm → cart 1 (site's own code); "How much is the chair?" → "$349" |
| Harbor Daily | ~0.5 s | 2.0–2.2 s | Sofa mode bar; subscribe bar closed; subscriber story: paywall kept, Ask refuses to read it |
| Wikipedia, BBC | 1.0–1.6 s | 2.9–5.6 s | (earlier layout) map, focus, sections, pop-ups, white page fix |

## Open (see REVIEW.md)
- **#22 (H):** Harbor Daily's front page isn't mapped as a listing (story cards missed, so the rail is thin and ◀◀ ▶▶ say "Sections" instead of "Pages").
- **#15:** look at Wikipedia and BBC in Sofa mode. BBC's white theme colour should get dark text.
- **Polish:** #13 (product questions), #23–26.
- **#7:** typing your own question (phone keyboard or Alexa+).
- **Older:** → from the right-most BBC story jumps far down; Allrecipes shows Cloudflare to this network.
- **AWS account `223663280030`** became `ACTIVE` on Oct 19 at 14:58 UTC; Bedrock was still flaky right after ("Operation not allowed" / "being verified"; contact aws-verification@amazon.com).

## Next steps, in order
1. Fix #22 and look at Wikipedia/BBC in Sofa mode (#15), in one batch with the polish items.
2. **Real stick:** put it on the Mac's network; measure time to first focus, Nova p50/p95, cached visit, memory.
3. **Proof:** a 20-site evaluation (focus coverage, false skips, grounded vs refused answers, paywall respected). Nova Act could drive it (AWS Builder).
4. **AWS Builder:** a Strands agent (Nova API provider now, Bedrock + AgentCore when the account is active), the cache, cost per 1,000 pages.
5. **Video:** the kitchen story (Sofa mode → Ask → highlight → Cook timer → phone), 15 s of the shop (WebMCP confirm), 10 s of the paywall standing, and a numbers card. Devpost write-up with "For site owners" from `STRATEGY.md`. Keep `FRICTION.md` up to date.

## How the user works
- **Writes in French or English. Answer in the language of their last message.**
- **Argue every choice against the four judging criteria.**
- **Review like a judge, then fix in batches**, not one tweak per build; write findings to `REVIEW.md`.
- **Wants a real product, not a demo:** no "Try it" or demo captions. Wants "Comet or Dia ++", above all easy from the sofa.
- **Publishers must be allies:** never hide ads, never bypass paywalls. **Don't mention Silk comparisons** (Amazon knows Silk).
- **Has rejected:** a Perplexity-style answer app; a "studio for site owners" pivot.
- **Never print the API key.** Ask before anything outward-facing.
