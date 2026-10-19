# Sofa Surf: judge's review (Oct 19, 2026)

The current build as a judge would see it, from the runs on the Vega Virtual Device with real Nova 2 Lite: Lina's Kitchen, Cedar & Pine, Wikipedia and BBC. Harbor Daily is built but was not run in the new layout.
Criteria are weighted equally; ties are broken in this order: **Tech → Design → Impact → Idea**.

## Verdict

| Criterion | Score /5 | Why |
|---|---|---|
| Technical implementation | **4.0** | Real page plus injected focus engine, two-tier understanding, real Nova with measured times, grounded answers with a checker, a WebMCP shim. The stick and Bedrock are still missing. |
| Design | **3.5** | The layout matches the approved mock-up, and the answer-to-highlight moment is beautiful. But the glyphs render as emoji, the home screen is weak, and the AI says it hid things that are still on screen (see the list below). |
| Potential impact | **3.0** | The kitchen use case is clear. No proof beyond our own sites in the new layout: no real stick, no 20-site evaluation, no "For publishers" story yet. |
| Quality of the idea | **4.3** | "The real web, made for the remote" plus "every answer points at the page" is distinctive. WebMCP with confirmation is ahead of the curve. |

**Overall: about 15/20, the same as the panel's plan score, but now backed by a working build.** The wow is real. What holds it back is visual polish on the first screens, and proof.

## The wow (keep, and build the video around it)

1. **The answer is on the page.** ≡ → "How many servings does this make?" → a grounded answer and its quote → OK. The page scrolls to the exact sentence, highlighted in amber and marked "✦ From this page". This is the 10 seconds no other TV browser can show, and it proves the AI doesn't invent anything.
2. **The page cleans itself.** Cookie banner (necessary cookies only), sticky ad and newsletter pop-up close by themselves, with a toast. The rail on the left lists the page's real sections in Nova's words.
3. **Cook mode in one press.** ▶❚❚ turns the blog into one step per screen. Back returns to the exact spot on the page.
4. **The shop declares, the TV confirms.** ▶❚❚ "Add to cart" opens a confirm sheet with the site's own words and the exact price from schema.org. On OK, the site's own code adds the chair (cart 0 → 1).

Measured on the Virtual Device: remote ready in **0.6–1.8 s**; Nova refine **1.7–3.0 s**; grounded answer **1.0–2.6 s**; Nova's refusal on "How many calories?" (correct, it's not on the page).

## Inconsistencies a judge would notice

Severity: **H** = visible in the video or breaks a promise · **M** = noticed on a closer look · **L** = polish.

| # | Where | What a judge sees | Criterion | Sev. | Fix |
|---|---|---|---|---|---|
| 1 | Hint bar, confirm sheet | **◀◀ ▶▶, ▶❚❚ and ↩ render as coloured emoji boxes** (orange and blue squares), not as amber text glyphs. They look like a different product. | Design | H | Add the text-presentation selector `︎` after each glyph, or draw the keys as small bordered "keycaps" in our own style. |
| 2 | Top bar vs page | **"3 distractions skipped", but the ads are still on screen.** Nova's hide list only takes them off the focus path. That breaks "the page cleans itself". | Design / Idea | H | Fade what Nova hid (opacity 0.15 with a small "✦ hidden" label) when the refinement arrives. The page stays honest, and the effect is visible. |
| 3 | Lina's Kitchen | **The newsletter pop-up stays up for about 3 s** before it closes. Our sweep runs at load, +0.3 s, +3 s and +6 s, and the pop-up opens at 1.2 s. | Design / Tech | H | Watch for new fixed overlays with a `MutationObserver` and close them as they appear. |
| 4 | Focus ring | The amber **label repeats the heading right below it** ("Weeknight Spaghetti Carbonara" above the same title). It's noise. | Design | M | Show the label only when Nova renamed the part, or for items with no visible title. |
| 5 | Ask | "This recipe serves four people", **backed by the "For two people, halve…" quote.** The checker passes it, but the evidence is indirect. | Tech / Idea | M | Rank quotes by how much they share with the answer; drop an answer whose key fact ("four", "4") isn't in any kept quote. Nova kept "Serves 4" out because it's under 12 characters; the whole-line rule now allows it. |
| 6 | Ask | "How much does the chair cost?" said **"Not on this page"**, a false refusal: "$349" was dropped as too short. | Tech | H | Fixed in `ground.py` (short whole-line facts with a number now count). Backend restarted; not re-run on the device. |
| 7 | Ask | **You can't ask your own question.** Only Nova's three suggestions. Judges will ask "what if I want something else?" | Impact | M | Phone as keyboard/voice (QR pairing), or Alexa+ positioning in the write-up. At least say it in the video. |
| 8 | Home | **First impression is weak:** "Where to?" over an empty dark billboard (no image), three flat colour cards, then a "The real web" row. The wow starts only after you open a page. | Design | H | Show a live preview of Lina's page in the billboard (a static screenshot of our own fictional site is fine), and caption the three cards with what happens there. Hide "The real web" when filming (`SHOW_REAL_WEB`). |
| 9 | Live page | **Body text is small** for 3 m: the page is laid out at 1200 CSS px × 1.28 ≈ 22 px body text, against the brief's 32–36 px. Reader (OK) fixes it, but that's a press away. | Design | M | Try 1100 px (≈ 1.4×) on the demo sites. Promote "OK Read" in the hints when the focus is on a section. |
| 10 | Shop | **The chat bubble covers the "Add to cart" button.** | Design | L | Clean-up now treats "chat with us / live chat" as a pop-up (code changed, not built). |
| 11 | Shop | **Our toast lands on top of the site's own toast** ("Added to cart…" twice, overlapping). | Design | M | Our toasts go to the bottom, above the hints (style half-changed, see "Code state"). |
| 12 | Top bar | A cached refinement says **"Refined by Nova 0.1 s"**, which undersells it. | Design | L | Say "remembered" under 400 ms (code changed, not built). |
| 13 | Rail | Nova named the title "Weeknight Spaghetti Carbonara" on two lines, while the other parts are short. On product pages, its questions are weak ("What other chairs are suggested?"). | Idea | L | Ask Nova for rail labels of at most 28 characters; the prompt already pushes practical questions, so add "never about other products". |
| 14 | Cook mode | Plain: no ingredient list, no timer, although step 1 says "about 9 minutes". | Wow | M | A timer for durations found in the step text (from the page, not invented): "OK Start 9-minute timer". A strong kitchen moment for the video. |
| 15 | Coverage | **Harbor Daily, Wikipedia and BBC haven't been run in the new frame** (layout 1200 px at 1.28×). The rail on a 53-section listing may be noisy. | Tech | M | One verification pass over all five sites after the batch. |
| 16 | Consistency of words | "Zoom" (docs, events) vs "Read" (hints); "Sections" vs "On this page"; "≡ Ask this page" vs "Ask another". | Design | L | One vocabulary: **Read · Sections · Ask · Cook · Back**. Update `design-prompt.md` with it. |
| 17 | Promise vs build | The approved layout and the design brief promise **"Send to phone"** and **"Open original"**. Neither exists. | Idea / Design | M | Either build "Send to phone" (QR with the URL, cheap) or remove it from the brief and the video. Never show a dead button. |

## The journey, step by step

| Step | Now | Judge's reaction |
|---|---|---|
| Home | Text billboard, 3 colour cards | "OK…" (no wow yet) → fix #8 |
| Open Lina's | Real page in a frame, rail fills, Nova status pulses then "Refined by Nova", pop-ups close | "Nice", but the pop-up lingers (#3) and the ads remain (#2) |
| ◀◀ ▶▶ | Jumps sections; the rail lights them | Clear and TV-native |
| OK on a section | Reader panel, large text | Good; the hint says "Read" |
| ≡ Ask | Glass panel over the page, 3 practical questions | Strong |
| OK on a question | Answer and quote in about 2 s | Strong (watch #5) |
| OK on the quote | Page scrolls, sentence highlighted, ring around it | **The wow** |
| ▶❚❚ | Cook mode, one step per screen | Good, could be great (#14) |
| Back | Back to the same spot | Feels native |
| Shop ▶❚❚ | Confirm sheet with the site's own words, then cart 1 | Strong and trustworthy (fix #11) |

## Impact: what's missing to convince

1. **Real Fire TV Stick numbers.** It's on another network (192.168.8.x vs 192.168.3.x). All five simulated judges asked for this.
2. **The "any website" proof:** a 20-site evaluation (focus coverage, false hides, grounded vs refused answers, fallback rate). We already have the probes (`map`, `clean`, `cover`, `answer` events) to automate it.
3. **"For publishers":** declare WebMCP tools and schema.org, and your site becomes a first-class TV app with zero TV work. That's the business case Amazon cares about.
4. **AWS Builder:** Nova API only; there's no Bedrock or Strands yet (the account is still pending).

## Publishers and Amazon (researched Oct 19)

**Who judges.** The judges on the hackathon page are Amazon people (Amazon Devices and Fire TV leadership, Fire TV Voice & AI, Alexa, Bee, Ring, AWS), Callstack (Vega OS partner) and one content owner: a Senior Technical Product Manager at the **NBA**. No web publisher. The rules add that judges "may be employees of the sponsor or third parties, may or may not be listed".

**Why Amazon still cares how publishers are treated.**
- **Amazon pays for AI content instead of taking it.** It licensed The New York Times (May 2025; for Alexa and model training), and Condé Nast and Hearst (July 2025; for Rufus).
- **Amazon is suing Perplexity over Comet** (Nov 2025). The complaint: Comet's agent posed as Google Chrome, logged into customer accounts and bought things, and kept going after Amazon blocked it. Amazon frames it as a transparency issue for third-party agents. Per a tracker, a March 2026 injunction was later vacated on appeal (not checked against the docket).
- **Publishers vs Perplexity and AI browsers:** about a dozen lawsuits (Dow Jones and the New York Post; Yomiuri; Nikkei and Asahi; the Chicago Tribune and NYT in Dec 2025, which say Comet gets past their paywall). Columbia Journalism Review showed Atlas and Comet reading a subscriber-only article in full, while looking like ordinary Chrome in site logs. Perplexity's answer was money: a revenue share with Comet Plus.

**So for Fire TV and Alexa judges, "Comet for TV" is a red flag unless Sofa Surf is visibly the opposite on the rules.** That makes the rules a feature to show, not a footnote:
1. **It says who it is:** a declared `SofaSurf` token in the user agent, never a disguise.
2. **It never gets past a paywall:** a subscribe wall stays, and Ask won't read the hidden text.
3. **Ads stay where the publisher put them:** every view is a real page view of the real page.
4. **It acts only where the site invites it:** WebMCP tools the site declared, and only after the viewer's OK.

### New inconsistencies this research exposes

| # | What | Sev. | Fix |
|---|---|---|---|
| 18 | **The clean-up would close a paywall.** It closes covering overlays whose text says "subscribe". On a real news site that's exactly the paywall bypass publishers are suing over. | **H** | Never close an overlay that reads as a paywall ("subscribe to continue", "subscribers only", "sign in to read", "already a subscriber"). Say "This page is for subscribers" instead. |
| 19 | **Ask could read text behind a paywall** (`innerText` includes text covered by an overlay). | **H** | When a paywall is detected, send no page text: "Sofa Surf can't read this page for you; it's for subscribers." |
| 20 | **The WebView doesn't declare Sofa Surf.** Only the backend sends `SofaSurf/0.1`. The page sees a stock WebView user agent. | **H** | Append ` SofaSurf/0.1 (+about page)` to the WebView's user agent, and add a one-page "for site owners" note with an opt-out rule. |
| 21 | **The clean-up hides a sticky ad** on Lina's Kitchen ("get the app"). | **H** | Never close anything that reads as an ad (advertisement, sponsored, ad iframes). Only close consent, sign-up, newsletter and chat prompts. |

## Batch 1: done and verified (Oct 19, evening)

One build; one pass on the Virtual Device with real Nova over Lina's Kitchen, Cedar & Pine and Harbor Daily (BBC opened once by accident).

**Fixed and seen working:**
- **Sofa mode.** The site's own app bar (icon, name, colour from its web app manifest), its menu as tabs (↑ from the top of the page), the cross-fade from Sofa Surf's address bar. Verified on all three sites.
- **Publisher rules:**
  - The sticky ad stays (#21).
  - The paywall on Harbor Daily's subscriber story stands, and Ask refuses to read it (#18, #19).
  - The WebView sends `SofaSurf/1.0` (#20).
  - `data-sofasurf` and `noai` are supported.
  - The cookie choice is made once on Home, and pressed with the site's own buttons.
- **#1** Key glyphs are text, not emoji.
- **#2** The top bar reads "N parts mapped" (no ad-hiding claim).
- **#3** The newsletter pop-up closes as soon as it opens.
- **#4** The amber label shows only when Nova renamed the part.
- **#5** Quotes are ranked against the answer, and the answer's numbers must be in its quotes.
- **#6** "$349" is accepted.
- **#8** A real product home: billboard art, "Continue", an address box, "Your apps", "On the web".
- **#9** The page is laid out at 1024 × 1.5.
- **#10** The chat bubble closes.
- **#11** The toast sits above the hints.
- **#12** "remembered" for cached refinements.
- **#14** The Cook timer from the step's text.
- **#16** One vocabulary.
- **#17** "Continue on your phone" (QR code of the page, at the Mac's Wi-Fi address) and "Add to Home" are built.
- **Highlight across blocks:** "Total time | 25 minutes" is now found.

**Still open (next batch):**

| # | What | Sev. |
|---|---|---|
| 22 | **Harbor Daily's front page is typed "Article"**, with 1 rail entry and 3 parts. Its story cards aren't mapped as items (no `<main>`, so the item scan misses them), so ◀◀ ▶▶ say "Sections", not "Pages". | H |
| 13 | Product questions are still weak ("Where can I add the chair to cart?"). | M |
| 23 | The amber "✦ From this page" label sits over the quote's own heading ("Total time"). Place it above the ring's top edge, or to the side. | L |
| 24 | The QR sheet's title repeats the site name ("… \| Lina's Kitchen"). | L |
| 25 | "1 parts mapped" (plural). | L |
| 26 | The Home address box is hard to see when not focused (low contrast). | M |
| 15 | Wikipedia and BBC haven't been looked at in Sofa mode yet. BBC's theme colour is white; the dark-text fallback is built but not seen. BBC overflows to 1402 px at the 1024 layout. | M |
| 7 | You still can't type a question of your own (phone keyboard or Alexa+). | M |

**Updated verdict: about 16.5/20.**
- **Tech 4.2:** the publisher rules are enforced in code and visible.
- **Design 4.2:** Sofa mode is the moment to film.
- **Impact 3.6:** the three-sided story (viewers, publishers, Amazon) is now real. It still needs proof: real stick numbers and the 20-site run.
- **Idea 4.5.**
