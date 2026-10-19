# Friction log: Sofa Surf on Vega OS

Friction we hit while building Sofa Surf, a web browser for Fire TV: React Native for Vega, the real page in a Vega WebView, and native layers above it. We wrote it down as it happened.
It focuses on **building for Vega**: where the boundary runs between the OS, the app and the WebView; the SDK and CLI; the Virtual Device; testing and debugging.
Each entry has the task, the steps, expected vs. actual, severity, our workaround, and a suggestion.

**Environment:** macOS (Apple Silicon, 8 GB RAM) · Vega SDK 0.24.12112 · Vega CLI 1.4.4 · React Native for Vega 0.83 · `@amazon-devices/webview` 4.0.2 · Vega Virtual Device (aarch64) · Fire TV Stick on Vega OS 2 (armv7).

**Severity:** High = costs hours or forces a redesign · Medium = costs time, workaround exists · Low = papercut.

## What would make the next Vega version better for developers
1. **Document the OS ↔ app ↔ WebView boundary.** Who gets each remote key, when the page bridge exists, what the page looks like at document start, and what the WebView does to the viewport (#1, #2, #3, #5). We found every one of these by trial and error, rebuilding each time.
2. **Make the WebView debuggable.** Report errors from injected scripts to the app (#3), and get DevTools working on the Virtual Device or say why it doesn't (#4).
3. **`vega device screenshot` / `screenrecord`** (#8). Every hackathon entry needs a video, and today there is no supported way to capture the app.
4. **A faster inner loop on an 8 GB Mac** (#9, #10, #11). A Virtual Device that survives a build, and CLI commands that fail loudly instead of silently or with a JavaScript exception.
5. **Mocks shipped with the Jest preset** for `BackHandler` and the system libraries (#13), and API references that Builder Tools can read (#14).

| # | Area | Friction | Severity |
|---|---|---|---|
| **OS, app and WebView boundaries** | | | |
| 1 | Remote input × WebView | The app and the page both receive the remote's keys, and nothing says who owns them | High |
| 2 | WebView bridge | `window.ReactNativeWebView` doesn't exist yet when the before-content-loaded script runs | Medium |
| 3 | WebView | An exception in `injectedJavaScriptBeforeContentLoaded` is silent: no `onError`, no log the app can read | Medium |
| 4 | WebView DevTools | Debug build on the Virtual Device: nothing listens on port 9229, so Chrome DevTools can't attach | Medium |
| 5 | WebView viewport | The WebView zooms the whole page out, and can drop the page's viewport after load | Medium |
| 6 | Layout | The Virtual Device's layout canvas is about half of 1920×1080 | Medium |
| 7 | Remote input | OK arrives as `select` on Vega OS 2 and as `enter` on Vega OS 1.3 | Low |
| **Toolchain and devices** | | | |
| 8 | Screen capture | No supported way to capture the app's screen on the Virtual Device or the stick | Medium |
| 9 | Vega Virtual Device | Killed by its own watchdog on an 8 GB Mac when building at the same time | Medium |
| 10 | Vega CLI | `vega run-app <vpkg> <appId>` crashes with a `trim` error | Medium |
| 11 | Fire TV Stick | First `launch-app` after install can silently do nothing | Low |
| 12 | Developer mode | Other Amazon accounts fail with an unexplained `http 401` | Low |
| **Testing and docs** | | | |
| 13 | Testing | The Vega Jest preset leaves `BackHandler` and the WebView module undefined | Low |
| 14 | Builder Tools MCP | The WebView component reference comes back as the site's navigation menu only | Low |

---

## OS, app and WebView boundaries

### 1. The app and the page both receive the remote's keys (High)
- **Task:** Make a real web page work from the remote: the page script moves focus with the D-pad, and native layers (Ask panel, confirm sheet, site tabs) take the remote while they are open.
- **Steps:** Oct 16 spike on the Virtual Device. A `keydown` listener in the page (injected script), and `useTVEventHandler` in the React Native screen that hosts the `WebView`.
- **Expected:** A documented focus model. Either the focused WebView consumes the keys, or the app decides where each key goes and can stop it.
- **Actual:**
  - Arrows (37–40), OK (13) and the media keys (179 play/pause, 227/228 rewind and fast-forward) reach the page as `keydown`. **At the same time,** `useTVEventHandler` receives every one of those keys as well.
  - Menu reaches only the app, never the page. We found no list of which keys go where, and no way for the app to keep a key from reaching the page.
  - The result: when a native panel opened above the page, the D-pad moved both the panel's selection and the page's focus underneath.
- **Workaround:**
  - We made Menu the key for our own AI panel, since it is the one key the page never sees.
  - When a native layer opens, the app sets a flag in the page with `injectJavaScript` (`ck.paused = true`), and the page script swallows the keys.
  - The app ignores keys unless one of its own layers is open.
  - So two key handlers, in two runtimes, are kept in step by hand.
- **Suggestion:** Document how keys are routed between React Native and a WebView, listing which keys reach the page. Add a way to route them, for example an `onKeyDown` on `WebView` that can claim a key before the page gets it, or a prop to give the remote to the native layer.

### 2. The page bridge isn't there at document start (Medium)
- **Task:** Send messages from the page script to the app as early as possible (page map, site identity), through `injectedJavaScriptBeforeContentLoaded`.
- **Steps:** Called `window.ReactNativeWebView.postMessage(...)` from the script at document start.
- **Expected:** The bridge exists whenever injected code runs, as in the WebView most React Native developers already know.
- **Actual:** `window.ReactNativeWebView` is undefined at document start and appears only around load, so the early messages were lost. No error comes back to the app either (see #3).
- **Workaround:** Every message goes into a queue, which is flushed whenever the bridge appears (checked on `DOMContentLoaded`, `load` and each later send).
- **Suggestion:** Attach the bridge before any injected script runs. Or document when it becomes available, and add a "bridge ready" event the page can listen for.

### 3. An exception in the before-content-loaded script is silent (Medium)
- **Task:** Run Sofa Surf's page script (focus engine, page map) in every page through `injectedJavaScriptBeforeContentLoaded`.
- **Steps:**
  1. Opened Wikipedia and BBC in the app; the page rendered normally.
  2. Waited for the script's `postMessage` events (`onMessage`).
- **Expected:** Either the events, or an error somewhere (`onError`, the device log, a console line).
- **Actual:**
  - No message and no error. A probe injected later with `injectJavaScript` showed `window.__clicker` existed but functions defined further down did not, so the script had thrown partway through.
  - The cause was ours: at document start `document.head` and `document.documentElement` are both `null`, and we appended a `<meta>` to them. Finding it took about an hour of rebuild-and-probe cycles (about 2 minutes each, since the Virtual Device has to be stopped to build, see #9).
- **Workaround:** Wrapped every step in `try/catch`, queued messages until the bridge exists (#2), reported errors through `postMessage`, and added an `onLoad` probe that reports what the early script did.
- **Suggestion:**
  - Report exceptions thrown by injected scripts to the app (an `onInjectedScriptError` callback or `onError` with the stack), at least in Debug builds.
  - Document what the page looks like when the before-content-loaded script runs (no `<html>` yet, no bridge yet).

### 4. WebView DevTools port not open in a Debug build on the Virtual Device (Medium)
- **Task:** Attach Chrome DevTools to the WebView to debug #3, following the Builder Tools "open Chrome DevTools" workflow.
- **Steps:** `npm run build:debug`; installed and launched `aarch64-debug` on the Virtual Device; opened a page; `vega exec vda forward tcp:9229 tcp:9229`; `curl localhost:9229/json/list`.
- **Expected:** The docs say DevTools is enabled by default in Debug builds and listens on 9229, with a target listed.
- **Actual:** `Empty reply from server`. `netstat -ltn` on the device showed no listener on 9229 (only 4070, 8009, 53, 60000).
- **Workaround:** Debugged blind with `postMessage` probes (see #3).
- **Suggestion:** Say whether the Virtual Device supports WebView DevTools, and what else is needed (a manifest entry, a prop, Vega Studio). Have the bring-up script check the device-side listener and print why there is no target.

### 5. The WebView zooms the whole page out, and can drop the viewport after load (Medium)
- **Task:** Lay every page out at a fixed CSS width (1024–1280 px), so desktop sites are readable from the sofa. We used a `<meta name="viewport">` set by the injected script.
- **Steps:** Opened recipe, shop and news pages (our demo sites, Wikipedia, BBC) with our viewport tag in place.
- **Expected:** The page keeps the width and scale the viewport tag asks for, as in mobile Chrome.
- **Actual:**
  - If one element is wider than the layout width, the WebView **zooms the whole page out** to fit it, and the text becomes too small to read on a TV. Only pinning `minimum-scale` and `maximum-scale` to the same value as `initial-scale` stopped it.
  - On BBC, **after load, the WebView stopped applying our viewport** although the tag was still in the DOM, unchanged. Removing it and inserting a fresh tag brought it back.
- **Workaround:** The page script pins the scale, watches `innerWidth`, re-inserts a fresh viewport tag when the width drifts, and keeps the tag in place with a `MutationObserver` when sites rewrite theirs.
- **Suggestion:** Document the WebView's viewport and zoom rules on TV. Add a WebView prop for a fixed layout width and scale (a "TV text zoom"), so a browser or a web-app shell doesn't need to fight the page for it.

### 6. The Virtual Device's layout canvas is about half of 1920×1080 (Medium)
- **Task:** Lay out a 10-foot UI designed on a 1920×1080 canvas.
- **Expected:** `Dimensions.get('window').width` is 1920, like the TV picture.
- **Actual:** About half that on the Virtual Device, so fixed sizes rendered twice too big.
- **Workaround:** Every size goes through a `px()` helper that scales by `width / 1920`.
- **Suggestion:** Document the logical canvas per device type in the layout guide. Or give the Virtual Device the same logical size as a Fire TV Stick.

### 7. OK button event name differs between Vega OS versions (Low)
- **Steps:** Read the OK key with `useTVEventHandler`.
- **Actual:** `eventType` is `select` on Vega OS 2 and `enter` on Vega OS 1.3.
- **Workaround:** Map `enter` to `select` in our key hook.
- **Suggestion:** Normalize the name, or document the difference on the `useTVEventHandler` page.

## Toolchain and devices

### 8. No supported way to capture the app's screen (Medium)
- **Task:** Take screenshots and record the demo video the rules require (a real device or the simulator).
- **Steps:** Ran `screenshooter` in the device shell, on the Virtual Device and on the stick.
- **Expected:** A screenshot or recording of the app.
- **Actual:** On the Virtual Device, `screenshooter` **hangs the emulator's display** until restart. On the stick it's blocked for the developer shell user.
- **Workaround:** On the Mac, find the Virtual Device's window ID (a small Swift script) and use `screencapture -l<id>`, then crop the title bar and on-screen remote with ffmpeg. For the stick, an HDMI capture card.
- **Suggestion:** `vega device screenshot` and `vega device screenrecord` commands. Every hackathon entry needs a video, so this would help every participant.

### 9. Virtual Device killed by its watchdog on an 8 GB Mac (Medium)
- **Task:** Build the app while the Virtual Device is running.
- **Steps:** `npm run build:app` with the Virtual Device started.
- **Expected:** Both run, maybe slowly.
- **Actual:** The Virtual Device takes 4 GB. macOS starts swapping, QEMU freezes for about 15 s, and its watchdog kills it: `detected a hanging thread 'QEMU2 main loop'` in `vvd/instances/*/virtual_device.err`.
- **Workaround:** Stop the Virtual Device before every build, then start it and reinstall (adds 1–2 minutes per iteration). Our `tools/cycle.sh` does stop → build → start → install → launch → check it runs.
- **Suggestion:** State the minimum RAM on the install page, offer a smaller memory profile, and make the watchdog more tolerant of host swapping.

### 10. `vega run-app` with an app ID crashes (Medium)
- **Task:** Install and run the app on the Virtual Device in one command.
- **Steps:** `vega run-app build/aarch64-release/<app>_aarch64.vpkg com.<app>.main -d VirtualDevice`
- **Expected:** The app installs and launches.
- **Actual:** `Cannot read properties of undefined (reading 'trim')`. Without the app ID it works, but it still fails now and then with the same error.
- **Workaround:** `vega device install-app -p <vpkg>`, then `vega device terminate-app -a <id>` and `vega device launch-app -a <id>`.
- **Suggestion:** Accept the app ID as documented, or print a usage error instead of a JavaScript exception.

### 11. First launch after install can silently fail (Low)
- **Steps:** `vega device install-app -d <stick> -p <armv7 vpkg>`, then `vega device launch-app -d <stick> -a <id>`.
- **Expected:** The app opens.
- **Actual:** Sometimes nothing happens, and the command still reports success. Seen on the stick, and on the Virtual Device on Oct 16 (the launch printed only "Additional logs can be found at …").
- **Workaround:** Launch in a loop until `vega device running-apps` lists the app.
- **Suggestion:** Wait for the app to be ready after install, or make `launch-app` report a launch that didn't happen.

### 12. Developer mode: other Amazon accounts fail with an unexplained 401 (Low)
- **Steps:** Tried to enable developer mode on the stick with an Amazon account other than the one registered as a developer (vendor).
- **Actual:** `Failed to verify vendor registration: http 401`.
- **Workaround:** Sign in with the developer account registered as a vendor.
- **Suggestion:** Say it in the message: "This Amazon account isn't registered as a developer. Sign in with your Amazon Developer account."

## Testing and docs

### 13. The Vega Jest preset leaves `BackHandler` and the WebView module undefined (Low)
- **Steps:** Render the app in a Jest test.
- **Actual:**
  - The app crashes on `BackHandler.addEventListener`.
  - After adding `@amazon-devices/webview`, every test file that imports it fails with `TurboModuleRegistry.getEnforcing(...): 'AmazonWebViewTurboModule' could not be found`.
- **Workaround:** Mock `BackHandler` in `react-native` and in `@amazon-devices/react-native-kepler`, and mock `@amazon-devices/webview` (`{WebView: () => null}`), in the test file.
- **Suggestion:** Ship mocks for `BackHandler` and for the system libraries (WebView first) with the preset.

### 14. The WebView component reference can't be read through Builder Tools (Low)
- **Task:** Read the Vega WebView props (user agent, injected scripts) through the Amazon Devices Builder Tools MCP.
- **Steps:** `read_document("https://developer.amazon.com/docs/vega-api/0.24/webview-component-reference.html")`.
- **Expected:** The props and methods.
- **Actual:** About 100,000 characters of the docs site's navigation menu, and none of the reference content.
- **Workaround:** Downloaded `@amazon-devices/webview@4.0.2` with `npm pack` and read `dist/types/WebViewTypes.d.ts`.
- **Suggestion:** Strip navigation from fetched API pages, or index the package's type comments.

---

## What worked well
- **Vega WebView 4.0.2:** script injection before load, two-way messages, D-pad and media keys inside the page, and native views drawn above the page all worked on the first try. That made a TV browser possible at all.
- **Amazon Devices Builder Tools MCP:** its documentation search found the Vega-supported gradient library (`@amazon-devices/react-linear-gradient`, built into the system) in seconds, after we had assumed Vega didn't have one.
- **`vega exec vda shell "inputd-cli button_press KEY_…"`:** driving the remote from scripts made focus flows easy to test (`tools/key.sh`).
- **`[network-traffic-policy.cleartext]` in `manifest.toml`:** WebView 4.0.2 blocks plain HTTP by default. One manifest table opened it for a browser that must load any site.
