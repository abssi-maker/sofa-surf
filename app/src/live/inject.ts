// Runs inside every web page, before it loads (injectedJavaScriptBeforeContentLoaded).
// Tier 1 of page understanding: plain code maps the page's real parts ("stops") in
// well under a second, so the remote works at once. Tier 2 (Nova, via the app)
// refines that map later through window.__clicker.refine().
// Messages to the app are JSON strings with a `t` field; see LivePage.tsx.
// The app prepends `window.__ckFrame = {frac, width, consent}`: the share of the screen's width the page
// gets, the CSS width to lay it out at, and the viewer's cookie choice (see frameScript in LiveChrome.tsx).
// Sofa Surf's rules with sites: ads stay, paywalls stand, consent is the viewer's choice through the site's
// own buttons, actions only through tools the site declares, and `<meta name="sofasurf" content="noai">` turns Nova off.

export const INJECT = String.raw`
(function () {
  if (window.__clicker) return;
  var CK = window.__clicker = {stops: [], cur: null, zoomed: null, queue: [], errors: [],
    born: {href: location.href.slice(0, 80), ready: document.readyState}, ran: {}};
  var T0 = Date.now();
  // The Vega WebView attaches the bridge only around load, so early messages wait in a queue.
  function bridge() { return window.ReactNativeWebView && window.ReactNativeWebView.postMessage ? window.ReactNativeWebView : null; }
  function flush() {
    var b = bridge();
    if (!b) return false;
    while (CK.queue.length) {
      try { b.postMessage(CK.queue.shift()); } catch (e) { CK.errors.push(String(e)); }
    }
    return true;
  }
  CK.flush = flush;
  function send(msg) {
    CK.queue.push(JSON.stringify(msg));
    flush();
  }
  var poll = setInterval(function () { if (flush() || Date.now() - T0 > 20000) clearInterval(poll); }, 50);

  // ---- WebMCP: a page can declare what an agent may do on it (navigator.modelContext). Chrome 144
  // has no native WebMCP, so Sofa Surf provides it: it lists the page's tools, and calls one only after
  // the viewer confirms on the TV. The page's own code does the work. ----
  var tools = {}, toolTimer = null;
  function toolList() {
    return Object.keys(tools).map(function (n) {
      var t = tools[n], a = t.annotations || {};
      return {name: n, title: a.title || n, description: String(t.description || '').slice(0, 200), readOnly: !!a.readOnlyHint, inputSchema: t.inputSchema || null};
    });
  }
  function toolsChanged() {
    clearTimeout(toolTimer);
    toolTimer = setTimeout(function () { send({t: 'tools', tools: toolList(), actions: CK.stops.length ? actions() : null}); }, 50);
  }
  var modelContext = {
    registerTool: function (t) {
      if (t && t.name && typeof t.execute === 'function') { tools[t.name] = t; toolsChanged(); }
      return {unregister: function () { delete tools[t.name]; toolsChanged(); }};
    },
    unregisterTool: function (name) { delete tools[name]; toolsChanged(); },
    provideContext: function (ctx) {
      tools = {};
      ((ctx && ctx.tools) || []).forEach(function (t) { if (t && t.name && typeof t.execute === 'function') tools[t.name] = t; });
      toolsChanged();
    },
    clearContext: function () { tools = {}; toolsChanged(); }
  };
  if (!navigator.modelContext) {
    try { Object.defineProperty(navigator, 'modelContext', {value: modelContext, configurable: true}); } catch (e) {}
  }
  // The page action for ▶❚❚: the first tool that changes something (reading tools need no button).
  function writeTool() { return toolList().filter(function (t) { return !t.readOnly; })[0] || null; }
  CK.callTool = function (name, args) {
    var t = tools[name];
    if (!t) { send({t: 'toolResult', name: name, ok: false, text: 'This page no longer offers that action.'}); return; }
    Promise.resolve()
      .then(function () { return t.execute(args || {}, {requestUserInteraction: function (cb) { return cb(); }}); })
      .then(function (r) {
        var text = r && r.content ? r.content.map(function (c) { return c.text || ''; }).join(' ') : String(r || '');
        send({t: 'toolResult', name: name, ok: true, text: text.slice(0, 300)});
      })
      .catch(function (e) { send({t: 'toolResult', name: name, ok: false, text: String((e && e.message) || e).slice(0, 200)}); });
  };

  // ---- Lay the page out at a fixed CSS width (1200 in Sofa Surf's frame): readable from the couch ----
  // The scale is pinned too: otherwise one element wider than the layout makes the WebView zoom the whole page out.
  var FRAME = window.__ckFrame || {frac: 1, width: 1280};
  var ours = null;
  function viewportContent() {
    var k = Math.round(((screen.width || 1920) * FRAME.frac / FRAME.width) * 1000) / 1000;
    return 'width=' + FRAME.width + ', initial-scale=' + k + ', minimum-scale=' + k + ', maximum-scale=' + k + ', user-scalable=no';
  }
  function viewport() {
    var want = viewportContent(), metas = document.querySelectorAll('meta[name=viewport]');
    for (var i = 0; i < metas.length; i++) if (metas[i] !== ours) metas[i].remove();
    if (!ours) { ours = document.createElement('meta'); ours.name = 'viewport'; }
    if (ours.content !== want) ours.content = want;
    if (!ours.isConnected) (document.head || document.documentElement).appendChild(ours);
  }
  // After load the WebView can drop our viewport although the tag is unchanged (BBC): a fresh tag brings it back.
  function reassert() {
    if (Math.abs(innerWidth - FRAME.width) <= 2 || !ours) return;
    ours.remove();
    ours = null;
    viewport();
    send({t: 'viewport', w: innerWidth, again: true});
  }
  // Some sites rewrite their viewport after load: put ours back.
  function keepViewport() {
    if (!document.head || CK.viewportWatch) return;
    CK.viewportWatch = new MutationObserver(function () {
      var metas = document.querySelectorAll('meta[name=viewport]');
      if (metas.length !== 1 || metas[0] !== ours || ours.content !== viewportContent()) viewport();
    });
    CK.viewportWatch.observe(document.head, {childList: true, subtree: true, attributes: true, attributeFilter: ['content']});
  }
  // At document start there is no <html> yet; onReady sets it again.
  if (document.documentElement) viewport();

  var css = [
    '.ck-ring{position:absolute;z-index:2147483645;pointer-events:none;box-sizing:border-box;border:4px solid #fff;',
    'border-radius:10px;box-shadow:0 0 0 8px rgba(255,181,71,.55),0 0 28px 8px rgba(255,181,71,.35);',
    'transition:left .18s,top .18s,width .18s,height .18s}',
    '.ck-tag{position:absolute;z-index:2147483646;pointer-events:none;background:#FFB547;color:#0B0F17;',
    'font:700 15px/1.2 system-ui,sans-serif;padding:4px 10px;border-radius:6px;white-space:nowrap;',
    'max-width:520px;overflow:hidden;text-overflow:ellipsis;transform:translateY(-130%)}',
    '.ck-pulse{outline:3px dashed rgba(255,181,71,.9)!important;outline-offset:-3px!important}',
    '::highlight(ck-quote){background-color:rgba(255,181,71,.55);color:inherit}',
    '@keyframes ckscan{from{transform:translateY(-30vh)}to{transform:translateY(110vh)}}',
    '.ck-scan{position:fixed;left:0;right:0;top:0;height:30vh;z-index:2147483647;pointer-events:none;',
    'background:linear-gradient(180deg,rgba(255,181,71,0),rgba(255,181,71,.28),rgba(255,181,71,0));',
    'animation:ckscan 1.1s ease-out forwards}'
  ].join('');

  // ---- Helpers ----
  function shown(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 14) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  }
  function rect(el) {
    var r = el.getBoundingClientRect();
    return {x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height};
  }
  function text(el, n) {
    var t = el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.value || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, n || 80);
  }
  function first(sel, root) {
    var all = (root || document).querySelectorAll(sel);
    for (var i = 0; i < all.length; i++) if (shown(all[i])) return all[i];
    return null;
  }

  // The schema.org data sites publish for search engines: exact facts, no guessing.
  function schema() {
    var out = {};
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      var t = [].concat(n['@type'] || []);
      if (t.indexOf('Recipe') >= 0 && !out.recipe) {
        var steps = [];
        (function flat(s) {
          if (!s) return;
          if (typeof s === 'string') { steps.push(s); return; }
          if (Array.isArray(s)) { s.forEach(flat); return; }
          if (s.itemListElement) flat(s.itemListElement); else if (s.text) steps.push(s.text);
        })(n.recipeInstructions);
        out.recipe = {
          name: n.name,
          ingredients: [].concat(n.recipeIngredient || []),
          steps: steps.map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
            .filter(function (s) { return s && !/^gather (all )?(the )?ingredients\.?$/i.test(s); })
        };
      }
      if (t.indexOf('Product') >= 0 && !out.product) {
        var offer = [].concat(n.offers || [])[0] || {};
        out.product = {name: n.name || '', price: offer.price || null, currency: offer.priceCurrency || null};
      }
      if (t.some(function (x) { return /Article|NewsArticle|BlogPosting/.test(x); })) out.article = true;
      if (t.indexOf('VideoObject') >= 0) out.video = true;
      walk(n['@graph']);
    }
    for (var i = 0; i < scripts.length; i++) {
      try { walk(JSON.parse(scripts[i].textContent)); } catch (e) {}
    }
    return out;
  }

  // The element whose paragraphs hold the most text: the main content.
  function mainRoot() {
    var m = first('main,[role=main],article');
    if (m) return m;
    var score = new Map(), best = document.body, max = 0;
    document.querySelectorAll('p').forEach(function (p) {
      var parent = p.parentElement, s = (score.get(parent) || 0) + (p.innerText || '').length;
      score.set(parent, s);
      if (s > max) { max = s; best = parent; }
    });
    return best;
  }

  // The list whose container's class or id matches a word ("ingredient", "instruction").
  function listBlock(re) {
    var best = null, most = 0;
    document.querySelectorAll('ul,ol').forEach(function (list) {
      var n = list, hit = false;
      for (var k = 0; k < 4 && n; k++, n = n.parentElement) {
        if (re.test((n.className && n.className.baseVal === undefined ? n.className : '') + ' ' + n.id)) { hit = true; break; }
      }
      var items = list.querySelectorAll('li').length;
      if (hit && items > most && shown(list)) { most = items; best = n || list; }
    });
    return best;
  }

  // ---- Tier 1: the page's stops ----
  function buildMap(final) {
    var t = Date.now(), facts = schema(), main = mainRoot(), stops = [], seen = new Set();
    function add(el, kind, label) {
      if (!el || seen.has(el) || !shown(el)) return;
      seen.add(el);
      stops.push({el: el, kind: kind, label: label || text(el, 80)});
    }
    add(first('h1'), 'title', text(first('h1') || document.body, 80) || document.title.split(/ [-|–] /)[0]);
    add(first('button[aria-label*="menu" i],[aria-label*="navigation" i]'), 'menu', 'Menu');
    add(first('input[type=search],input[name=q],input[name=search],input[name*="search" i],input[placeholder*="search" i]'), 'search', 'Search');
    add(first('video'), 'video', 'Video');
    add(first('[class*="video-player" i],[class*="videoplayer" i],[class*="jwplayer" i],[class*="video-js" i]'), 'video', 'Video');
    add(listBlock(/ingredient/i), 'ingredients', 'Ingredients');
    add(listBlock(/instruction|direction|method|preparation|steps/i), 'steps', 'Steps');
    // Headings inside a block we already have (Ingredients, Steps) or repeating the title add nothing.
    var titleText = stops[0] && stops[0].kind === 'title' ? stops[0].label.toLowerCase() : null;
    main.querySelectorAll('h2,h3').forEach(function (h) {
      if (stops.some(function (s) { return s.el.contains(h); })) return;
      if (titleText && text(h, 80).toLowerCase() === titleText) return;
      add(h, 'section');
    });
    var links = new Set();
    (facts.recipe || facts.article ? main : document).querySelectorAll('a[href]').forEach(function (a) {
      var label = text(a, 90);
      if (stops.length > 120 || links.has(a.href) || !a.querySelector('img') || label.length < 12) return;
      links.add(a.href);
      add(a, 'item', label);
    });
    var next = first('a[rel=next]');
    if (!next) document.querySelectorAll('a,button').forEach(function (b) {
      if (!next && /^(next|next page|load more|show more|more results|›|»|→)$/i.test(text(b, 20)) && shown(b)) next = b;
    });
    add(next, 'next', 'Next page');
    document.querySelectorAll('button,a,input[type=submit]').forEach(function (b) {
      if (/add to (cart|bag|basket)/i.test(text(b, 40))) add(b, 'cart', 'Add to cart');
    });

    stops.sort(function (a, b) { var ra = rect(a.el), rb = rect(b.el); return ra.y - rb.y || ra.x - rb.x; });
    stops.forEach(function (s, i) { s.id = i; });
    CK.stops = stops;

    var type = facts.recipe ? 'recipe' : facts.product ? 'product'
      : stops.filter(function (s) { return s.kind === 'item'; }).length >= 8 && !facts.article ? 'listing'
      : facts.video ? 'video' : 'article';
    CK.type = type;
    CK.recipe = facts.recipe || null;
    send({
      t: 'map', tier: 'code', final: !!final, ms: Date.now() - t, sinceInject: Date.now() - T0,
      type: type, title: document.title.slice(0, 100), url: location.href.slice(0, 200),
      viewport: {w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth,
        scale: window.visualViewport ? Math.round(visualViewport.scale * 100) / 100 : null,
        metas: [].map.call(document.querySelectorAll('meta[name=viewport]'), function (m) { return (m === ours ? '*' : '') + m.content; }),
        watching: !!CK.viewportWatch},
      actions: actions(),
      recipe: facts.recipe ? {name: facts.recipe.name, steps: facts.recipe.steps.slice(0, 40)} : null,
      product: facts.product || null,
      tools: toolList(),
      noai: CK.noai,
      paywall: !!CK.paywall,
      // The page's own words, for Ask this page (only with the final map).
      text: final ? pageText() : null,
      stops: stops.slice(0, 80).map(function (s) {
        var r = rect(s.el);
        return {id: s.id, kind: s.kind, label: s.label, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h)};
      })
    });
  }

  // What the media keys do on this page; the app shows these as hints.
  function actions() {
    var has = function (k) { return CK.stops.some(function (s) { return s.kind === k; }); };
    var w = writeTool();
    return {
      play: CK.recipe && CK.recipe.steps.length ? 'Cook mode' : w ? w.title : has('video') ? 'Play video' : null,
      tool: !(CK.recipe && CK.recipe.steps.length) && w ? w.name : null,
      skip: CK.type === 'listing' && has('next') ? 'Pages' : 'Sections'
    };
  }

  // The main content's text, one line per block, for grounded answers.
  function pageText() {
    if (CK.noai || paywalled()) return '';
    var lines = (mainRoot().innerText || '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); });
    return lines.filter(function (l) { return l.length > 1; }).join('\n').slice(0, 20000);
  }

  // ---- Focus ----
  // The ring and the label are overlays of their own, so no page container can clip them.
  var tag = null, ring = null, mark = null;
  // The ring hugs the focused part, or the quote an answer points to.
  function target() {
    if (mark) {
      var b = mark.getBoundingClientRect();
      return {x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height};
    }
    return CK.cur ? rect(CK.cur.el) : null;
  }
  function place() {
    var r = ring && target();
    if (!r) return;
    var pad = 8;
    ring.style.left = (r.x - pad) + 'px';
    ring.style.top = (r.y - pad) + 'px';
    ring.style.width = (r.w + 2 * pad) + 'px';
    ring.style.height = (r.h + 2 * pad) + 'px';
    tag.style.left = Math.max(8, r.x - pad) + 'px';
    tag.style.top = (r.y - pad - 6) + 'px';
  }
  function focus(s) {
    if (!s) return;
    if (CK.cur) CK.cur.el.classList.remove('ck-focus');
    CK.cur = s;
    s.el.classList.add('ck-focus');
    s.el.scrollIntoView({block: 'center', behavior: 'smooth'});
    if (!tag) {
      tag = document.createElement('div'); tag.className = 'ck-tag'; document.body.appendChild(tag);
      ring = document.createElement('div'); ring.className = 'ck-ring'; document.body.appendChild(ring);
      // Images and ads keep moving the page while it loads: follow the focused part.
      setInterval(place, 400);
    }
    tag.textContent = s.label;
    var shows = text(s.el, 120).toLowerCase(), says = s.label.toLowerCase().replace(/…$/, '');
    tag.style.display = shows.indexOf(says) === 0 ? 'none' : '';
    place();
    send({t: 'focus', id: s.id, kind: s.kind, label: s.label, section: sectionOf(s)});
  }
  // The big part of the page (title, section, ingredients...) the focus is in: the app's rail lights it.
  function sectionOf(s) {
    var y = rect(s.el).y + 2, sec = null;
    CK.stops.forEach(function (x) { if (MAJOR[x.kind] && !x.hidden && x.el.isConnected && rect(x.el).y <= y) sec = x.id; });
    return sec;
  }

  // ---- Answers point at the page: scroll to the quote, highlight it, ring it ----
  // The browser's own find can't cross block boundaries ("Total time" | "25 minutes"), so after the whole
  // quote it tries shorter runs of its words, longest first, keeping the ones that hold a number.
  function findText(q) {
    var sel = getSelection(), curly = q.replace(/'/g, '’'), tries = [q, curly, q.slice(0, 90), q.slice(0, 50)];
    var words = q.split(/\s+/);
    for (var n = words.length - 1; n >= 2; n--) {
      for (var k = 0; k + n <= words.length; k++) {
        var run = words.slice(k, k + n).join(' ');
        if (run.length >= 6 && (n >= 4 || /\d/.test(run))) tries.push(run);
      }
    }
    for (var i = 0; i < tries.length; i++) {
      sel.removeAllRanges();
      if (tries[i].length >= 6 && window.find(tries[i], false, false, true, false, false, false) && sel.rangeCount) {
        var r = sel.getRangeAt(0).cloneRange();
        sel.removeAllRanges();
        return r;
      }
    }
    sel.removeAllRanges();
    return null;
  }
  CK.show = function (quote) {
    unmark();
    var range = findText(String(quote || ''));
    if (!range) { send({t: 'mark', on: false, found: false}); return; }
    mark = range;
    if (window.Highlight && window.CSS && CSS.highlights) CSS.highlights.set('ck-quote', new Highlight(range));
    var n = range.startContainer, el = n.nodeType === 1 ? n : n.parentElement;
    el.scrollIntoView({block: 'center', behavior: 'smooth'});
    if (tag) { tag.textContent = '✦ From this page'; tag.style.display = ''; }
    place();
    var y = target().y, near = null;
    live().forEach(function (s) { if (MAJOR[s.kind] && rect(s.el).y <= y + 2) near = s; });
    send({t: 'mark', on: true, found: true, section: near ? near.id : null});
  };
  // Leaving a quote: the focus continues from the part of the page that holds it.
  function unmark() {
    if (!mark) return false;
    var y = target().y, near = null, best = Infinity;
    mark = null;
    if (window.CSS && CSS.highlights) CSS.highlights.delete('ck-quote');
    live().forEach(function (s) { var d = Math.abs(rect(s.el).y - y); if (d < best) { best = d; near = s; } });
    if (near) focus(near); else place();
    send({t: 'mark', on: false});
    return true;
  }
  CK.unmark = unmark;
  function start() {
    var first = CK.type === 'listing' ? 'item' : 'title';
    return CK.stops.find(function (s) { return s.kind === first && !s.hidden; })
      || CK.stops.find(function (s) { return s.kind === 'title' && !s.hidden; })
      || CK.stops.find(function (s) { return s.kind !== 'menu' && s.kind !== 'search' && !s.hidden; })
      || CK.stops[0];
  }
  function live() {
    return CK.stops.filter(function (s) { return s.el.isConnected && !s.hidden && shown(s.el); });
  }
  // The nearest stop in the pressed direction; sideways distance counts double.
  function move(dir) {
    var list = live();
    if (!list.length) return;
    if (!CK.cur || list.indexOf(CK.cur) < 0) {
      focus(list.find(function (s) { return rect(s.el).y >= scrollY; }) || list[0]);
      return true;
    }
    var c = rect(CK.cur.el), cx = c.x + c.w / 2, cy = c.y + c.h / 2, best = null, bestScore = Infinity;
    list.forEach(function (s) {
      if (s === CK.cur) return;
      var b = rect(s.el), dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, main, side;
      if (dir === 'down') { main = dy; side = dx; } else if (dir === 'up') { main = -dy; side = dx; }
      else if (dir === 'right') { main = dx; side = dy; } else { main = -dx; side = dy; }
      if (main <= 4) return;
      var score = main + 2 * Math.abs(side);
      if (score < bestScore) { bestScore = score; best = s; }
    });
    if (best) focus(best);
    return !!best;
  }
  // ◀◀ ▶▶ jump between the big parts of the page (or pages of results).
  var MAJOR = {title: 1, section: 1, ingredients: 1, steps: 1, video: 1};
  function skip(dir) {
    var nextLink = CK.stops.find(function (s) { return s.kind === 'next'; });
    if (CK.type === 'listing' && nextLink) {
      if (dir > 0) nextLink.el.click(); else history.back();
      return;
    }
    var majors = live().filter(function (s) { return MAJOR[s.kind]; });
    var y = CK.cur ? rect(CK.cur.el).y : scrollY;
    var target = dir > 0
      ? majors.find(function (s) { return rect(s.el).y > y + 4; })
      : majors.filter(function (s) { return rect(s.el).y < y - 4; }).pop();
    if (target) focus(target);
  }

  // ---- OK on a heading: read from there (the section moves to the top of the screen) ----
  // No copies of the page: Sofa mode shows the site itself at sofa size, ads and all.
  function readHere(s) {
    s.el.scrollIntoView({block: 'start', behavior: 'smooth'});
    setTimeout(place, 450);
    send({t: 'read', id: s.id});
  }

  // ---- Remote keys ----
  var ARROWS = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
  var BLOCKS = {title: 1, section: 1, ingredients: 1, steps: 1};
  var KEYS = {13: 1, 37: 1, 38: 1, 39: 1, 40: 1, 179: 1, 227: 1, 228: 1};
  window.addEventListener('keydown', function (e) {
    var code = e.keyCode;
    // A native panel (Ask, confirm) has the remote: the page keeps still.
    if (CK.paused && KEYS[code]) { e.preventDefault(); e.stopPropagation(); return; }
    if (mark && (ARROWS[code] || code === 13)) { e.preventDefault(); e.stopPropagation(); unmark(); return; }
    if (ARROWS[code]) {
      e.preventDefault(); e.stopPropagation();
      // Nothing above: the remote goes up to the site's tabs (the app's top bar).
      if (!move(ARROWS[code]) && code === 38) send({t: 'edge', dir: 'up'});
    } else if (code === 13 && CK.cur) {
      e.preventDefault();
      if (BLOCKS[CK.cur.kind]) readHere(CK.cur);
      else if (CK.cur.kind === 'search') CK.cur.el.focus();
      else CK.cur.el.click();
    } else if (code === 179) {
      e.preventDefault();
      var v = document.querySelector('video');
      var w = writeTool();
      if (CK.recipe && CK.recipe.steps.length) send({t: 'action', action: 'cook'});
      else if (w) send({t: 'action', action: 'tool', tool: w});
      else if (v) { if (v.paused) v.play(); else v.pause(); }
      else send({t: 'action', action: 'none'});
    } else if (code === 227 || code === 228) {
      e.preventDefault();
      skip(code === 228 ? 1 : -1);
    }
  }, true);

  // ---- Tier 2: Nova's refinement (names, noise removed), applied when it arrives ----
  CK.refine = function (r) {
    var hide = new Set(r.hide || []);
    CK.stops.forEach(function (s) {
      if (hide.has(s.id)) s.hidden = true;
      if (r.labels && r.labels[s.id]) s.label = r.labels[s.id];
      if (!s.hidden && (MAJOR[s.kind])) {
        s.el.classList.add('ck-pulse');
        setTimeout(function () { s.el.classList.remove('ck-pulse'); }, 1400);
      }
    });
    if (CK.cur && CK.cur.hidden) move('down'); else if (CK.cur) focus(CK.cur);
    send({t: 'refined', hidden: hide.size});
  };

  // ---- Pop-ups: the viewer's cookie choice (pressed with the site's own button), then sign-up, newsletter
  // and chat prompts. Never an ad, never a paywall: those are the publisher's business. ----
  var POPUP = /cookie|consent|gdpr|privacy|subscribe|newsletter|sign up|notification|chat with us|live chat/i;
  var PAYWALL = /subscribe to (continue|read|keep reading)|subscribers? only|for subscribers|already a subscriber|sign in to (continue|read)|(reached|used) your (free )?(article )?limit|free articles? (left|remaining)|create a free account to (continue|read)/i;
  var AD = /\badvertisement\b|\bsponsored\b|\bad choices\b|\bpromoted\b|get the app/i;
  var REFUSE = /^(reject all|reject|decline|refuse|only necessary|necessary only|use necessary cookies only|continue without accepting)$/i;
  var ACCEPT = /^(accept all|accept|allow all|accept cookies|allow cookies|i agree|agree)$/i;
  // A paywall stands: Sofa Surf won't close it, and Ask won't read what it covers.
  function paywalled() {
    if (CK.paywall) return true;
    var walls = document.querySelectorAll('[class*="paywall" i],[id*="paywall" i],[class*="regwall" i],[class*="tp-modal" i]');
    var wall = [].some.call(walls, function (w) { return shown(w); });
    if (!wall) {
      document.querySelectorAll('div,section,aside,dialog').forEach(function (el) {
        var cs = getComputedStyle(el);
        if (!wall && (cs.position === 'fixed' || cs.position === 'sticky') && shown(el) && PAYWALL.test((el.innerText || '').slice(0, 600))) wall = true;
      });
    }
    if (wall) { CK.paywall = true; send({t: 'paywall'}); }
    return wall;
  }
  function clean() {
    var t = Date.now(), closed = 0, vw = innerWidth, vh = innerHeight, what = [];
    document.querySelectorAll('div,section,aside,dialog,iframe,form').forEach(function (el) {
      if (/(^| )ck-/.test(el.className)) return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      var r = el.getBoundingClientRect();
      if (r.width * r.height < 1) return;
      var words = (el.innerText || '').slice(0, 600);
      if (PAYWALL.test(words) || AD.test(words) || el.querySelector('ins.adsbygoogle,iframe[id*="google_ads"],[id*="ad-slot" i],[class*="ad-slot" i]')) return;
      var covers = (r.width * r.height) / (vw * vh) > 0.25;
      var talks = POPUP.test(words) && r.height > 40;
      var headerBar = r.top <= 2 && r.height < vh * 0.15 && !talks;
      if (!(covers || talks) || headerBar) return;
      var choice = FRAME.consent === 'all' ? ACCEPT : REFUSE;
      var pressed = Array.prototype.find.call(el.querySelectorAll('button,a'), function (b) { return choice.test(text(b, 40)); });
      if (pressed) pressed.click();
      what.push(describe(el) + (covers ? ' covers' : '') + (talks ? ' talks' : '') + (pressed ? (FRAME.consent === 'all' ? ' accepted' : ' refused') : ''));
      el.style.setProperty('display', 'none', 'important');
      closed++;
    });
    [document.documentElement, document.body].forEach(function (n) {
      if (n && getComputedStyle(n).overflow === 'hidden') n.style.setProperty('overflow', 'auto', 'important');
    });
    if (closed) send({t: 'clean', closed: closed, ms: Date.now() - t, what: what});
  }
  function watchPopups() {
    var pending = null;
    new MutationObserver(function () {
      if (pending) return;
      pending = setTimeout(function () { pending = null; clean(); }, 120);
    }).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'open']});
  }

  // ---- The site as a TV app: its own name, icon, colour and menu (web app manifest first, then meta tags) ----
  function absolute(u) { try { return new URL(u, location.href).href; } catch (e) { return null; } }
  function siteInfo() {
    var meta = function (sel) { var m = document.querySelector(sel); return m && (m.content || m.href) || null; };
    var icons = [].slice.call(document.querySelectorAll('link[rel~="apple-touch-icon"],link[rel~="icon"]'));
    var nav = first('header nav,nav[aria-label],[role=navigation],nav'), tabs = [], seen = {};
    if (nav) nav.querySelectorAll('a[href]').forEach(function (a) {
      var label = text(a, 30), href = a.getAttribute('href') || '';
      if (tabs.length >= 7 || !label || label.length > 24 || href === '#' || /^javascript:/i.test(href) || !shown(a)) return;
      var abs = absolute(href);
      if (abs && !seen[abs]) { seen[abs] = 1; tabs.push({label: label, href: abs}); }
    });
    return {
      name: meta('meta[property="og:site_name"]') || meta('meta[name="application-name"]') || location.hostname.replace(/^www\./, ''),
      color: meta('meta[name="theme-color"]'),
      icon: icons.length ? absolute(icons[icons.length - 1].getAttribute('href')) : null,
      tabs: tabs,
      noai: CK.noai
    };
  }
  function site() {
    var info = siteInfo(), link = document.querySelector('link[rel="manifest"]');
    send(Object.assign({t: 'site', from: 'page'}, info));
    if (!link) return;
    // The manifest a site wrote for "install on phone" is, here, its Fire TV app manifest.
    fetch(link.href).then(function (r) { return r.json(); }).then(function (m) {
      var big = (m.icons || []).slice().sort(function (a, b) { return parseInt(b.sizes, 10) - parseInt(a.sizes, 10); })[0];
      send(Object.assign({t: 'site', from: 'manifest'}, info, {
        name: m.short_name || m.name || info.name,
        color: m.theme_color || info.color,
        icon: big ? new URL(big.src, link.href).href : info.icon
      }));
    }).catch(function () {});
  }
  function describe(el) {
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ')[0].slice(0, 30)
      + ' ' + cs.position + ' z' + cs.zIndex + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)
      + (cs.opacity !== '1' ? ' op' + cs.opacity : '') + (cs.filter !== 'none' ? ' ' + cs.filter : '')
      + ' bg' + cs.backgroundColor.replace(/\s/g, '');
  }
  // What sits on top of the middle of the screen once the page settles: finds overlays the clean-up missed.
  function cover() {
    send({
      t: 'cover',
      top: document.elementsFromPoint(innerWidth / 2, innerHeight * 0.6).slice(0, 5).map(describe),
      viewport: {w: innerWidth, scale: window.visualViewport ? Math.round(visualViewport.scale * 100) / 100 : null},
      body: describe(document.body),
      html: describe(document.documentElement),
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      behindText: (function () {
        var h = document.querySelector('main h2, main h3, h2, h3');
        for (var n = h; n; n = n.parentElement) {
          var bg = getComputedStyle(n).backgroundColor;
          if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return describe(n) + ' text ' + getComputedStyle(h).color;
        }
        return h ? 'none, text ' + getComputedStyle(h).color : null;
      })(),
      dialogs: document.querySelectorAll('dialog[open]').length,
      inert: document.querySelectorAll('[inert]').length
    });
  }

  function scan() {
    var s = document.createElement('div');
    s.className = 'ck-scan';
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1300);
  }

  send({t: 'inject', ready: document.readyState});
  // A page with no background of its own is white in any browser; without this the app's dark background shows through.
  function paper() {
    var tr = function (n) { var bg = getComputedStyle(n).backgroundColor; return bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent'; };
    if (document.body && tr(document.documentElement) && tr(document.body)) document.documentElement.style.backgroundColor = '#fff';
  }
  function onReady() {
    viewport();
    paper();
    // Sites can style themselves for Sofa Surf, and can turn its AI off.
    document.documentElement.setAttribute('data-sofasurf', '1');
    var optOut = document.querySelector('meta[name="sofasurf"]');
    CK.noai = !!(optOut && /noai/i.test(optOut.content || ''));
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    scan();
    clean();
    // The map as soon as the DOM exists: focus works before images and ads finish loading.
    paywalled();
    buildMap(false);
    keepViewport();
    watchPopups();
    focus(start());
    site();
  }
  function onLoaded() {
    reassert();
    var cur = CK.cur && CK.cur.el;
    buildMap(true);
    var again = cur && CK.stops.find(function (s) { return s.el === cur; });
    focus(again || start());
    var nav = performance.timing || {}, mem = performance.memory || {};
    send({
      t: 'perf',
      dcl: nav.domContentLoadedEventEnd ? nav.domContentLoadedEventEnd - nav.navigationStart : null,
      load: nav.loadEventEnd ? nav.loadEventEnd - nav.navigationStart : null,
      heapMB: mem.usedJSHeapSize ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      elements: document.getElementsByTagName('*').length
    });
    paper();
    setTimeout(reassert, 300);
    setTimeout(clean, 300);
    setTimeout(clean, 3000);
    setTimeout(clean, 6000);
    setTimeout(cover, 6500);
  }
  // Injected before the page loads, or late by the app's onLoad fallback: either way, run each step once.
  function guard(fn) {
    return function () { try { fn(); } catch (e) { CK.errors.push(String(e && e.stack || e).slice(0, 300)); send({t: 'error', error: CK.errors[CK.errors.length - 1]}); } };
  }
  // Each step runs once, from the page's own events or from CK.boot() (the app's onLoad fallback).
  function once(name, fn) {
    return guard(function () { if (CK.ran[name]) return; CK.ran[name] = Date.now() - T0; fn(); });
  }
  var ready = once('ready', onReady), loaded = once('loaded', onLoaded);
  CK.boot = function () {
    if (document.readyState !== 'loading') ready();
    if (document.readyState === 'complete') loaded();
  };
  document.addEventListener('DOMContentLoaded', ready);
  window.addEventListener('load', loaded);
  CK.boot();
})();
true;
`;
