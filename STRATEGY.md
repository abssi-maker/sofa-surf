# Sofa Surf: the browser that publishers defend (Oct 19, 2026)

## The bet in one line
**Answer engines take the visit. Browsers give the visit.** Sofa Surf is a browser: every page it shows is the publisher's real page, with their ads, their paywall, their brand and their analytics. AI makes that page work from the sofa, so it doesn't replace the page with a summary. That puts publishers on our side and against the answer engines.

## Is it risky?
Only if Sofa Surf behaves like Comet. Here's what got AI browsers into court, and what Sofa Surf does instead:

| What publishers and Amazon sued over | Sofa Surf |
|---|---|
| Posing as Chrome so sites can't tell (Amazon v. Perplexity, Nov 2025) | Says who it is: `SofaSurf` in every request, plus a public page for site owners |
| Reading subscriber articles past the paywall (Tribune and NYT v. Perplexity, Dec 2025; CJR test of Comet and Atlas) | The paywall stands. Ask and Sofa mode only use what the viewer can see. |
| Summaries that replace the visit (Dow Jones, Yomiuri, Nikkei and Asahi suits) | No summary page. Every answer *points into* the real page (scroll and highlight), which means more time on the page. |
| An agent buying on a site that didn't agree to it (Amazon v. Perplexity) | Acts only through tools the site declares (WebMCP), and only after the viewer's OK |

The risk becomes the pitch: **"the AI browser built the way Amazon asked AI agents to behave."**

## Where TV browsing stands (2026)
- **Most TV platforms gave up on the web:** Roku and Apple TV have no browser, and Google TV ships none. The common advice is "cast it from your phone". That's why people forgot TVs can browse.
- **Samsung (Tizen) and LG (webOS)** have basic built-in browsers, with no alternative and a pointer you push around. Their AI bet is **answer assistants**: Perplexity and Copilot on Samsung's Vision AI Companion, Copilot and Gemini on LG. In other words, the zero-click model publishers are fighting, now on the biggest screen in the house.
- **Fire TV:** Silk, a desktop browser with a cursor, hard to use from a sofa. **Vega OS** has an app gap (no sideloading, Fire OS apps rebuilt one by one). Amazon even streams some Android apps from the cloud to fill it.
- **So:** nobody makes *the web itself* work on TV, and nobody offers publishers a way onto TV without building an app.

## The ideal TV experience: better than the desktop
The TV has things the desktop doesn't (a big shared screen, lean-back, a remote with 9 buttons, Alexa, the phone in your hand). Sofa Surf uses all of them:
1. **Every website, its own Fire TV app (Sofa mode).** The site's own name, logo, colour and menu become a TV app shell, and the real page shows at sofa size in the site's own responsive layout. One press adds it to Home as an app.
2. **The remote does the site's job.** Focus jumps between the page's real parts. ◂◂ ▸▸ go section to section, or page to page. ▸❚❚ does the page's main action: Cook mode, Play, or a tool the site declared (Add to cart).
3. **Ask this page, and see where.** Nova suggests the questions people really ask. Answers come only from the page, and OK scrolls to the sentence and highlights it. You can't do that on a desktop without reading the whole page yourself.
4. **Modes the desktop doesn't have:** Cook mode (one step per screen, timers from the recipe's own text) and Theater (the page's video full screen).
5. **Hand-off:** "Continue on your phone" (QR code) for sign-in, checkout or long typing. Later, the phone as keyboard and voice via Alexa+.

## The publisher deal: zero effort, full control
**What every site gets, with no work:** a Fire TV app made from its own pages, a new audience on the biggest screen, a real page view for every visit, its ads seen on a 55" screen by the whole family, and its paywall and consent respected.

**What a site can add, all optional and all existing standards:**
| Add | Sofa Surf uses it for |
|---|---|
| A web app manifest (name, icons, `theme_color`) | The app's look and its Home tile |
| schema.org (Recipe, Product, Article, VideoObject) | Cook mode, the price on the confirm sheet, Theater, sections |
| WebMCP tools (`navigator.modelContext`) | Actions on the remote: Add to cart, Book, Subscribe, each confirmed by the viewer |
| A few CSS lines for `html[data-sofasurf]` | Fine-tuning its own TV look |

**What a site controls:**
- **See:** the `SofaSurf/1.0` user-agent token segments TV traffic in its analytics.
- **Limit:** `<meta name="sofasurf" content="noai">` keeps browsing but turns Nova off on its pages.
- **Refuse:** a robots rule for `SofaSurf` blocks it entirely.

**What Nova does with a page:** it reads it only when a viewer opens it, for that viewer. It never crawls, never trains on it, and never shows a summary in place of the page. Cached for a day to save cost; that's to be written into the "for site owners" page.

## What Amazon gets
1. **The long tail of the web as Vega OS apps, overnight,** with no porting. That answers the Vega app gap.
2. **A Nova showcase on Fire TV:** Nova 2 Lite reads every page, and Nova Act can act where sites allow agents.
3. **Alexa+ next:** "Alexa, open Lina's Kitchen" → the site as an app. "Alexa, how long does it bake?" → the answer, pointed at the page.
4. **Proof of Amazon's own position on agents:** declared, consensual, transparent. Exactly what it asked of Perplexity.

## Nova Act: where it fits
Nova Act (GA Dec 2025) is Amazon's agent that operates web UIs. Sofa Surf uses agents **only where the site allows it**:
- **On the TV:** multi-step tasks ("reserve a table for 4 at 8 pm") only on sites that declare tools or allow agents. Each step is shown on the real page, and the viewer confirms.
- **Behind the scenes (AWS Builder):** Nova Act drives the 20-site evaluation, checking that every page's map, actions and answers work. Real AWS use, with no publisher exposure.

## What this changes in the build (adds to REVIEW.md's batch)
1. The WebView declares `SofaSurf/1.0`; add `data-sofasurf` on `<html>`; respect `noai`.
2. Paywalls stand: never close a subscribe wall, and send no hidden text to Ask (#18, #19).
3. Ads untouched: the clean-up only handles consent, sign-up, newsletter and chat prompts (#21).
4. Consent: ask once on first launch (necessary only / accept all), then press the site's own button for that choice.
5. Sofa mode: the app shell from the manifest, `og:` tags and the site's menu; the page at sofa size; "Add to Home".
6. The Ask panel footer: "✦ Nova reads this page only for you. The site's ads, paywall and analytics are untouched."
7. A "For site owners" section in the README and the Devpost story (the table above).

## Sources
- Hackathon page and rules (judges, criteria): https://amazonappdev2026.devpost.com/
- Amazon v. Perplexity (Comet): https://www.retaildive.com/news/amazon-sues-perplexity-ai-shopping-agents/804871/ · https://ppc.land/amazon-sues-perplexity-over-covert-ai-agent-access-to-marketplace/ · tracker incl. appeal: https://keywordseverywhere.com/news/perplexity-updates/comet-browser/
- Publisher suits and deals: https://pressgazette.co.uk/platforms/news-publisher-ai-deals-lawsuits-openai-google/ · https://www.mediapost.com/publications/article/408472/None
- AI browsers and paywalls (CJR): https://cjr.org/analysis/how-ai-browsers-sneak-past-blockers-and-paywalls.php
- Amazon's licensing deals: https://axios.com/2025/05/30/nyt-amazon-ai-licensing-deal · https://digiday.com/business-of-ai/conde-nast-and-hearst-strike-amazon-ai-licensing-deals-for-rufus/
- TV platforms: https://castbrowser.tv/guides/internet-browser-on-smart-tv · https://gizmodo.com/lg-tvs-get-unremovable-microsoft-copilot-app-2000699870 · https://community.roku.com/t5/Channels-viewing/Why-doesn-t-Roku-have-an-Internet-browser/m-p/807268 · Vega OS app gap: https://liliputing.com/amazon-goes-all-in-on-vega-os-for-fire-tv-devices-android-based-fire-os-media-streamers-days-are-numbered/
- Nova Act GA: https://aws.amazon.com/about-aws/whats-new/2025/12/build-automate-production-ui-workflows-nova-act
- Signed agents (Web Bot Auth), the future way to prove identity: https://blog.cloudflare.com/signed-agents/
