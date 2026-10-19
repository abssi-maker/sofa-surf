You are a senior product designer who specialises in 10-foot TV interfaces (Netflix, Apple TV, Fire TV). Design **Sofa Surf**, an AI web browser for Amazon Fire TV: *Dia / Comet, but for the TV, and on the publishers' side*.

## The product in one line
Sofa Surf shows **the real website**, then makes it work with a TV remote **as if the site had been built as its own Fire TV app**. It is a browser, not an answer engine: the page stays the hero, every visit is a real page view, and the AI points into the page instead of replacing it.

## The problem to solve
TV platforms gave up on the web. Roku and Apple TV have no browser, Google TV ships none, and Fire TV's Silk moves a mouse pointer across desktop pages. The AI that TV makers add (Perplexity, Copilot) answers *instead of* the site. People forgot a TV can browse, and publishers have no way onto the biggest screen without building an app.

## The big idea: every website, its own Fire TV app
The remote's limits are the design brief. A D-pad, OK, Back, Menu, Play/Pause, Rewind and Fast-forward are enough when the AI understands the page:
- **Sofa mode (the signature moment).** For a second, Sofa Surf's own address bar shows while "✦ Nova is reading the page…". Then it cross-fades to **the site's own app bar**: its icon, name and brand colour, and its own menu as TV tabs. The data comes from the site's web app manifest, or else its meta tags. The page is shown at sofa size in the site's own tablet layout. It now feels like that site's Fire TV app. "Add to Home" puts it on the Home screen like any app.
- **Smart focus instead of a pointer.** The page's real parts (title, sections, ingredients, steps, products, stories, search) are the only focus stops. A ring hugs the real element; a small amber label appears only when the AI renamed the part.
- **The page's actions on the remote:** ▶❚❚ does the page's main action (Cook mode on a recipe; on a shop, a tool the site declares, such as Add to cart). ◀◀ ▶▶ go to the previous or next section, or page of results. ↑ at the top of the page reaches the site's tabs. OK on a heading reads from there.
- **Ask this page (≡).** A glass panel slides in from the right with 3 practical questions Nova wrote for this page. Answers are grounded: each quote is checked word for word against the page. OK on a quote closes the panel, scrolls the page to it and highlights it in amber ("✦ From this page"). If the page doesn't say it: "Not on this page."
- **Cook mode.** One step per screen, readable from the stove, with a timer taken from the step's own text ("OK Start a 9-minute timer").
- **Hand-offs** at the bottom of the Ask panel: "Add [site] to Home" and "Continue on your phone" (a QR code of the exact page, for sign-in, checkout or typing).

## The rules with publishers (design must make them visible)
- **Ads stay** where the publisher put them. Never hide, dim or copy them.
- **Paywalls stand.** On a subscriber page the rail says "for subscribers", and Ask says Sofa Surf won't read it.
- **Consent is the viewer's choice**, set once on Home (necessary only / accept all), and pressed with the site's own buttons. Cookie banners, newsletter pop-ups and chat prompts close with a quiet toast.
- **Actions only where the site invites them** (WebMCP tools). A confirm sheet shows the site's own description and price, with "OK Confirm · ← Cancel", and "Sofa Surf never acts without your OK".
- **The AI signature** (✦ and amber) appears only where the AI acted, never on the site's content.

## Who and where
A family on the couch, 3 metres from a 55" TV, holding a Fire TV remote, with a phone nearby.

## Hard constraints
- **Canvas:** 1920×1080. Minimum text size 24 px; body text 32–36 px in native UI.
- **No pointer and no hover**, ever. Focus is always visible, never lost or trapped. Back closes the newest layer first (sheet, panel, tabs, highlight), then leaves the page.
- **Remote buttons apps can use:** D-pad, OK, Back, Menu (≡), Rewind, Play/Pause, Fast-forward. The microphone belongs to Alexa.
- **Built on Vega OS (React Native):** the page is a real web view; Sofa Surf's layer is native views around and above it. The cheapest stick has 1 GB of RAM: keep overlays light.
- **Fictional websites only**, no real brands: "Lina's Kitchen" (a cluttered recipe blog), "Cedar & Pine" (a furniture shop that declares WebMCP tools), "Harbor Daily" (local news, with one subscriber story).

## The approved layout (live page)
- **Top bar (96 px):** Sofa Surf's address bar while Nova reads; then the site's app bar (its icon, name, colour, tabs; on the right "✦ Sofa mode" and Nova's time). Light brand colours get dark text.
- **Left rail (380 px):** "ON THIS PAGE", the page type and one fact (6 steps · $349 · for subscribers), the page's sections in Nova's words with the current one lit, and at the bottom "≡ Ask this page" with Nova's first question.
- **Centre:** the real page.
- **Bottom hint bar (80 px):** only the 2–4 keys that matter now, drawn as text glyphs (never emoji). Example: `▶❚❚ Cook mode · ◀◀ ▶▶ Sections · OK Read from here · ≡ Ask this page`.
- **Right Ask panel (720 px):** slides in over the page on ≡.

## Words (one vocabulary everywhere)
Sofa mode · Sections · Read from here · Ask this page · Cook mode · Add to Home · Continue on your phone · Back. "✦ Refined by Nova", "✦ From this page", "Not on this page".

## Brand and visual direction
- **Sofa Surf**, tagline "Surf the web from your sofa"; Home subtitle "Every website, made for your remote."
- Cinematic and dark around the page; the site itself is the bright content; Sofa Surf's panels are translucent glass.
- **Colour tokens:** background #0B0F17 · panel #151B26 · text #F2F4F8 · dim text #9AA4B5 · AI accent amber #FFB547 · focus white #FFFFFF. In Sofa mode, the top bar takes the **site's** colour.
- **Focus:** native UI scales 1.05–1.08 with a white fill or ring; on the page, a white ring with an amber glow that hugs the element.
- **Motion:** 150–250 ms ease-out; the browser-to-app cross-fade is about 650 ms (the moment to film); the Ask panel slides from the right.

## Screens to design (1920×1080, high fidelity)
1. **Home:** "Where to?", a billboard with the last site's artwork and "Continue: …", an address box ("Type a website or search"), "Your apps" (sites added to Home, with their own artwork), "On the web", and the cookie choice.
2. **Opening a site:** Sofa Surf's address bar, "✦ Nova is reading the page…", the amber scan sweeping the page.
3. **Sofa mode:** Lina's Kitchen as its own TV app (terracotta bar, icon, tabs), rail of sections, focus on the recipe title, hint bar.
4. **Tabs:** ↑ from the top of the page; the "Recipes" tab focused.
5. **Ask this page:** 3 questions, the grounded answer, quotes with "OK Show me on the page", the two hand-offs, and the note "✦ Nova reads this page only for you. The site's ads, paywall and analytics are untouched."
6. **The answer on the page:** the quote highlighted, ringed, "✦ From this page".
7. **Cook mode** with a running timer chip ("Step 1 · 8:54").
8. **Shop:** Cedar & Pine in Sofa mode, the confirm sheet for "Add to cart", then the cart at 1.
9. **Subscriber page:** Harbor Daily, the site's own paywall standing, the Ask panel saying Sofa Surf won't read it.
10. **Continue on your phone:** the QR sheet with the page title.

## What to deliver
The frames above as one flow; component specs (app bar and tabs, rail, hint keys, Ask panel rows, sheets, toast, Home tiles); a remote map per screen; motion notes for the cross-fade, scan, panel and highlight; type and spacing tokens for 1920×1080.

## What success looks like
Someone watching the 3-minute video says: *"Every website just became a TV app, and the site still gets the visit."* A publisher watching it should want their site on Sofa Surf.
