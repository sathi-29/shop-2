/**
 * JARVIS web widget – drop-in voice assistant for the shop.
 *
 *   import { initJarvis } from './jarvis-assistant/web/jarvis.js';
 *   initJarvis({ apiUrl: '/api/assistant', micButton: '#jarvis-mic',
 *                getAuthToken: () => localStorage.getItem('token'),
 *                onAction: (a) => { ... } });
 *
 * Speech in/out uses the browser's built-in Web Speech API (no extra keys).
 * Best in Chrome / Edge / Android Chrome / Samsung Internet; needs HTTPS (or localhost) for the mic.
 *
 * Actions the assistant asks the website to do arrive in onAction AND as a window event "jarvis:action":
 *   { type:'navigate', screen:'home|cart|orders|profile|reels|wishlist|product|checkout|payment', productId?, orderId? }
 *   { type:'cart_changed' }                 -> refresh your cart badge/state
 *   { type:'order_placed', orderId }        -> refresh orders
 */
const DEFAULTS = {
  apiUrl: '/api/assistant',
  micButton: null,            // CSS selector string (works even if the button renders later) or an Element
  getAuthToken: null,         // () => string | Promise<string>   sent as "Authorization: Bearer <token>"
  fetchOptions: null,         // e.g. { credentials: 'include' } if you use cookie sessions
  lang: 'en-IN',
  onAction: null,
  wakeWord: false,            // say "Hey Jarvis" while the page is open (keeps the mic on; off by default)
  accent: '#3b2acf',
  accent2: '#ff7a1a',
  currency: '₹',
};

const GREETING = { 'en-IN': "Hi, I'm Jarvis. What would you like to shop for?", 'hi-IN': 'नमस्ते, मैं जार्विस हूँ। आप क्या खरीदना चाहते हैं?', 'kn-IN': 'ನಮಸ್ಕಾರ, ನಾನು ಜಾರ್ವಿಸ್. ನೀವು ಏನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಿ?' };
const BYE = /^(bye|goodbye|good bye|stop|close|cancel|that'?s all|thank you|thanks|exit)\.?$/i;
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const CSS = (a, b) => `
.jv-root{--jv-a:${a};--jv-b:${b};font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#14142b}
.jv-root *{box-sizing:border-box}
.jv-back{position:fixed;inset:0;background:rgba(15,10,50,.45);opacity:0;pointer-events:none;transition:opacity .2s;z-index:99998}
.jv-sheet{position:fixed;left:0;right:0;bottom:0;margin:0 auto;width:100%;max-width:520px;height:86vh;max-height:760px;background:#f6f6fd;border-radius:24px 24px 0 0;box-shadow:0 -10px 40px rgba(20,10,80,.25);display:flex;flex-direction:column;transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.8,.2,1),height .2s;z-index:99999;padding-bottom:env(safe-area-inset-bottom,0)}
.jv-open .jv-back{opacity:1;pointer-events:auto}.jv-open .jv-sheet{transform:none}
.jv-mini .jv-back{opacity:0;pointer-events:none}.jv-mini .jv-sheet{height:auto;max-height:none;border-radius:20px;bottom:76px;width:calc(100% - 24px)}
.jv-mini .jv-feed,.jv-mini .jv-input{display:none}
.jv-head{display:flex;align-items:center;gap:8px;padding:14px 16px 6px}
.jv-title{font-weight:800;font-size:17px;flex:1;display:flex;align-items:center;gap:8px}
.jv-dot{width:9px;height:9px;border-radius:50%;background:#bbb}
.jv-s-listening .jv-dot{background:#22c55e}.jv-s-thinking .jv-dot{background:var(--jv-b)}.jv-s-speaking .jv-dot{background:var(--jv-a)}
.jv-btn{border:0;background:#fff;border-radius:12px;height:36px;min-width:36px;padding:0 10px;font-size:14px;font-weight:600;color:#33335c;box-shadow:0 1px 3px rgba(0,0,0,.08);cursor:pointer}
.jv-select{border:0;background:#fff;border-radius:12px;height:36px;padding:0 8px;font-size:13px;font-weight:600;color:#33335c;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.jv-feed{flex:1;overflow-y:auto;padding:8px 14px 12px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
.jv-msg{max-width:85%;padding:10px 14px;border-radius:18px;font-size:15px;line-height:1.35;white-space:pre-wrap;word-wrap:break-word}
.jv-user{align-self:flex-end;background:var(--jv-a);color:#fff;border-bottom-right-radius:6px}
.jv-bot{align-self:flex-start;background:#fff;border-bottom-left-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.jv-note{align-self:center;font-size:12.5px;color:#76769a;text-align:center;padding:2px 10px}
.jv-cards{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 6px;scroll-snap-type:x mandatory}
.jv-card{flex:0 0 190px;scroll-snap-align:start;background:#fff;border-radius:18px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:4px}
.jv-card.jv-wide{flex:1 1 auto;width:100%}
.jv-img{height:120px;border-radius:12px;background:#e9e9f5;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:#a3a3c8;overflow:hidden;position:relative}
.jv-img img{width:100%;height:100%;object-fit:cover}
.jv-pos{position:absolute;top:6px;left:6px;background:var(--jv-a);color:#fff;border-radius:10px;font-size:12px;font-weight:700;padding:2px 8px}
.jv-brand{font-size:11px;font-weight:700;letter-spacing:.04em;color:#8a8aa8;text-transform:uppercase;margin-top:4px}
.jv-name{font-size:14px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.jv-sub{font-size:12px;color:#6b6b8c}
.jv-price{font-size:16px;font-weight:800}.jv-mrp{font-size:12px;color:#9a9ab5;text-decoration:line-through;margin-left:6px;font-weight:500}.jv-off{font-size:12px;color:#16a34a;margin-left:6px;font-weight:700}
.jv-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
.jv-add{border:0;background:var(--jv-b);color:#fff;border-radius:12px;width:38px;height:34px;font-size:20px;font-weight:700;cursor:pointer}
.jv-oos{font-size:12px;color:#dc2626;font-weight:700}
.jv-box{background:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:6px;font-size:14px}
.jv-box h4{margin:0;font-size:14px}.jv-line{display:flex;justify-content:space-between;gap:10px}.jv-tot{font-weight:800;border-top:1px dashed #d6d6ea;padding-top:6px}
.jv-pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;background:#e8e6fb;color:var(--jv-a)}
.jv-pill.ok{background:#dcfce7;color:#15803d}.jv-pill.bad{background:#fee2e2;color:#b91c1c}
.jv-tl{list-style:none;margin:6px 0 0;padding:0 0 0 4px}.jv-tl li{position:relative;padding:0 0 12px 22px;font-size:13px}
.jv-tl li:before{content:'';position:absolute;left:3px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--jv-a)}
.jv-tl li:after{content:'';position:absolute;left:7px;top:15px;bottom:-3px;width:2px;background:#d9d6f5}.jv-tl li:last-child:after{display:none}
.jv-tl li.now:before{background:var(--jv-b);box-shadow:0 0 0 4px rgba(255,122,26,.2)}.jv-tl small{display:block;color:#7b7b9c}
.jv-stage{display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 16px 10px}
.jv-orb{width:72px;height:72px;border-radius:50%;border:0;background:radial-gradient(circle at 30% 30%,#7b6cff,var(--jv-a));color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;box-shadow:0 6px 18px rgba(59,42,207,.4)}
.jv-orb svg{width:30px;height:30px;fill:#fff}
.jv-orb:before,.jv-orb:after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--jv-a);opacity:0}
.jv-s-listening .jv-orb:before{animation:jvp 1.4s ease-out infinite}.jv-s-listening .jv-orb:after{animation:jvp 1.4s ease-out .5s infinite}
.jv-s-speaking .jv-orb{animation:jvb .9s ease-in-out infinite}.jv-s-thinking .jv-orb{background:radial-gradient(circle at 30% 30%,#ffb066,var(--jv-b));animation:jvs 1.1s linear infinite}
@keyframes jvp{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.9);opacity:0}}
@keyframes jvb{50%{transform:scale(1.1)}}@keyframes jvs{50%{transform:scale(.93)}}
.jv-status{font-size:13px;color:#5d5d80;min-height:18px;text-align:center;max-width:90%}
.jv-input{display:flex;gap:8px;padding:6px 14px 12px}
.jv-input input{flex:1;border:0;border-radius:14px;padding:0 14px;height:42px;font-size:15px;background:#fff;box-shadow:inset 0 0 0 1px #e1e1f2;outline:none}
.jv-input input:focus{box-shadow:inset 0 0 0 2px var(--jv-a)}
.jv-send{border:0;border-radius:14px;background:var(--jv-a);color:#fff;font-weight:700;padding:0 16px;height:42px;cursor:pointer}
`;

const MIC = '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const safeUrl = (u) => (typeof u === 'string' && /^(https?:\/\/|\/|data:image\/)/.test(u) ? u : null);

export function initJarvis(userOpts = {}) {
  const o = { ...DEFAULTS, ...userOpts };
  if (typeof document === 'undefined') return null;
  if (window.__jarvis) return window.__jarvis;

  const sid = (() => { try { let s = sessionStorage.getItem('jarvis_sid'); if (!s) { s = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^a-z0-9-]/gi, ''); sessionStorage.setItem('jarvis_sid', s); } return s; } catch { return 'sid' + Date.now(); } })();

  let state = 'idle', isOpen = false, lang = o.lang, muted = false, rec = null, listenId = 0, silentRounds = 0, greeted = false, wakeRec = null;

  // ---------- DOM ----------
  const style = h('style'); style.textContent = CSS(o.accent, o.accent2);
  const feed = h('div', { class: 'jv-feed', 'aria-live': 'polite' });
  const status = h('div', { class: 'jv-status', role: 'status' });
  const orb = h('button', { class: 'jv-orb', 'aria-label': 'Talk to Jarvis', onclick: onOrb }); orb.innerHTML = MIC;
  const input = h('input', { type: 'text', placeholder: 'Or type here…', 'aria-label': 'Type a message', enterkeyhint: 'send' });
  const form = h('form', { class: 'jv-input', onsubmit: (e) => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ''; submit(t); } } }, input, h('button', { class: 'jv-send', type: 'submit' }, 'Send'));
  const langSel = h('select', { class: 'jv-select', 'aria-label': 'Language', onchange: () => { lang = langSel.value; } },
    ...[['en-IN', 'English'], ['hi-IN', 'हिन्दी'], ['kn-IN', 'ಕನ್ನಡ'], ['ta-IN', 'தமிழ்'], ['te-IN', 'తెలుగు']].map(([v, t]) => h('option', { value: v, ...(v === lang ? { selected: 'selected' } : {}) }, t)));
  const muteBtn = h('button', { class: 'jv-btn', 'aria-label': 'Mute voice', onclick: () => { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; if (muted) speechSynthesis.cancel(); } }, '🔊');
  const miniBtn = h('button', { class: 'jv-btn', 'aria-label': 'Minimise', onclick: () => root.classList.toggle('jv-mini') }, '▾');
  const closeBtn = h('button', { class: 'jv-btn', 'aria-label': 'Close', onclick: () => close() }, '✕');
  const sheet = h('div', { class: 'jv-sheet', role: 'dialog', 'aria-label': 'Jarvis voice assistant' },
    h('div', { class: 'jv-head' }, h('div', { class: 'jv-title' }, h('span', { class: 'jv-dot' }), 'Jarvis'), langSel, muteBtn, miniBtn, closeBtn),
    feed, h('div', { class: 'jv-stage' }, orb, status), form);
  const back = h('div', { class: 'jv-back', onclick: () => close() });
  const root = h('div', { class: 'jv-root jv-s-idle' }, back, sheet);
  document.head.append(style); document.body.append(root);

  // ---------- helpers ----------
  const setState = (s, text) => { state = s; root.className = root.className.replace(/jv-s-\w+/, '') + ' jv-s-' + s; status.textContent = text ?? ({ idle: 'Tap the mic to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: '' }[s] || ''); };
  const scroll = () => { feed.scrollTop = feed.scrollHeight; };
  const bubble = (who, text) => { feed.append(h('div', { class: `jv-msg ${who === 'user' ? 'jv-user' : 'jv-bot'}` }, text)); scroll(); };
  const note = (t) => { feed.append(h('div', { class: 'jv-note' }, t)); scroll(); };
  const money = (n) => o.currency + Number(n).toLocaleString('en-IN');
  const when = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  const day = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
  const fire = (action) => { try { o.onAction && o.onAction(action); } catch (e) { console.error('[jarvis] onAction', e); } window.dispatchEvent(new CustomEvent('jarvis:action', { detail: action })); };

  // ---------- cards ----------
  function productCard(p, wide) {
    const src = safeUrl(p.image);
    const img = h('div', { class: 'jv-img' }, src ? h('img', { src, alt: '', loading: 'lazy' }) : (p.brand || '?').slice(0, 1), p.position ? h('span', { class: 'jv-pos' }, p.position) : null);
    const price = h('div', {}, h('span', { class: 'jv-price' }, money(p.price)), p.mrp > p.price ? h('span', { class: 'jv-mrp' }, money(p.mrp)) : null, p.discountPct ? h('span', { class: 'jv-off' }, p.discountPct + '% off') : null);
    const extra = [];
    if (p.description) extra.push(h('div', { class: 'jv-sub' }, p.description));
    if (p.sizes && p.sizes.length) extra.push(h('div', { class: 'jv-sub' }, 'Sizes: ' + p.sizes.join(', ')));
    if (p.colors && p.colors.length) extra.push(h('div', { class: 'jv-sub' }, 'Colours: ' + p.colors.join(', ')));
    return h('div', { class: 'jv-card' + (wide ? ' jv-wide' : ''), onclick: () => fire({ type: 'navigate', screen: 'product', productId: p.id }) },
      img, h('div', { class: 'jv-brand' }, p.brand), h('div', { class: 'jv-name' }, p.name), h('div', { class: 'jv-sub' }, [p.category, p.subcategory].filter(Boolean).join(' · ') + (p.rating ? `  ★ ${p.rating}` : '')), ...extra,
      h('div', { class: 'jv-row' }, price, p.inStock === false ? h('span', { class: 'jv-oos' }, 'Out of stock') : h('button', { class: 'jv-add', 'aria-label': 'Add to cart', onclick: (e) => { e.stopPropagation(); submit(`Add ${p.name} to my cart`); } }, '+')));
  }
  function render(block) {
    switch (block.type) {
      case 'products': return h('div', { class: 'jv-cards' }, block.items.map((p) => productCard(p, block.items.length === 1)));
      case 'cart': return h('div', { class: 'jv-box' }, h('h4', {}, `Your cart (${block.lines.length})`), block.lines.length ? block.lines.map((l) => h('div', { class: 'jv-line' }, h('span', {}, `${l.quantity} × ${l.name}${l.size ? ` (${l.size})` : ''}`), h('span', {}, money(l.price * l.quantity)))) : h('div', { class: 'jv-sub' }, 'Empty'), block.lines.length ? h('div', { class: 'jv-line jv-tot' }, h('span', {}, 'Subtotal'), h('span', {}, money(block.subtotal))) : null);
      case 'order_summary': return h('div', { class: 'jv-box' }, h('h4', {}, 'Confirm your order'), block.lines.map((l) => h('div', { class: 'jv-line' }, h('span', {}, `${l.quantity} × ${l.name}${l.size ? ` (${l.size})` : ''}`), h('span', {}, money(l.price * l.quantity)))), h('div', { class: 'jv-line' }, h('span', {}, 'Delivery'), h('span', {}, block.delivery ? money(block.delivery) : 'Free')), h('div', { class: 'jv-line jv-tot' }, h('span', {}, 'Total'), h('span', {}, money(block.total))), h('div', { class: 'jv-sub' }, '📍 ' + block.address), h('div', { class: 'jv-sub' }, '💳 ' + block.payment), h('div', { class: 'jv-sub' }, 'Say “yes” to place it, or “no” to change.'));
      case 'order_placed': return h('div', { class: 'jv-box' }, h('span', { class: 'jv-pill ok' }, 'Order placed ✓'), h('div', { class: 'jv-line' }, h('span', {}, 'Order'), h('b', {}, block.orderId)), h('div', { class: 'jv-line' }, h('span', {}, 'Total'), h('b', {}, money(block.total))), h('div', { class: 'jv-line' }, h('span', {}, 'Expected'), h('b', {}, day(block.eta))));
      case 'orders': return h('div', { class: 'jv-box' }, h('h4', {}, 'Your orders'), block.items.map((it) => h('div', { class: 'jv-line', style: 'cursor:pointer', onclick: () => submit(`Track order ${it.order_id}`) }, h('span', {}, h('b', {}, it.order_id), h('div', { class: 'jv-sub' }, it.items.join(', '))), h('span', { class: 'jv-pill' + (it.status === 'delivered' ? ' ok' : it.status === 'cancelled' ? ' bad' : '') }, it.status_text.split(',')[0]))));
      case 'tracking': {
        const ev = block.events || [];
        return h('div', { class: 'jv-box' }, h('div', { class: 'jv-line' }, h('h4', {}, block.orderId), h('span', { class: 'jv-pill' + (block.status === 'delivered' ? ' ok' : '') }, block.statusText)),
          h('div', { class: 'jv-sub' }, block.items.join(', ')),
          h('div', {}, '📍 ', h('b', {}, block.currentLocation || '—')),
          block.deliveredAt ? h('div', {}, 'Delivered ', h('b', {}, when(block.deliveredAt))) : block.eta ? h('div', {}, 'Expected ', h('b', {}, day(block.eta))) : null,
          block.courier ? h('div', { class: 'jv-sub' }, 'Courier: ' + block.courier) : null,
          h('ul', { class: 'jv-tl' }, ev.slice().reverse().map((e, i) => h('li', { class: i === 0 ? 'now' : '' }, e.label, h('small', {}, [e.location, when(e.time)].filter(Boolean).join(' · '))))));
      }
      default: return null;
    }
  }

  // ---------- speech ----------
  let voices = [];
  const loadVoices = () => { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; };
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices); }
  function speak(text) {
    return new Promise((resolve) => {
      if (muted || !window.speechSynthesis || !text) return resolve();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang.startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
      u.rate = 1.03;
      const guard = setTimeout(done, Math.min(25000, 2500 + text.length * 110));
      let finished = false;
      function done() { if (finished) return; finished = true; clearTimeout(guard); resolve(); }
      u.onend = done; u.onerror = done;
      setState('speaking', '');
      speechSynthesis.speak(u);
    });
  }
  function stopListening() { listenId++; if (rec) { try { rec.onend = rec.onresult = rec.onerror = null; rec.abort(); } catch {} rec = null; } }
  function listen() {
    if (!isOpen) return;
    if (!SR) { setState('idle', 'Voice input is not supported in this browser. Please type.'); return; }
    stopListening();
    const id = ++listenId; let finalText = '', fatal = false;
    rec = new SR(); rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onstart = () => { if (id === listenId) setState('listening'); };
    rec.onresult = (e) => {
      if (id !== listenId) return;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (finalText += e.results[i][0].transcript) : (interim += e.results[i][0].transcript));
      status.textContent = '“' + (finalText + interim).trim() + '”';
    };
    rec.onerror = (e) => {
      if (id !== listenId) return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { fatal = true; note('Microphone is blocked. Allow mic access in the browser (needs HTTPS), or type your request.'); }
      else if (e.error === 'network') { fatal = true; note('Speech recognition needs an internet connection.'); }
      else if (e.error === 'audio-capture') { fatal = true; note('No microphone found.'); }
    };
    rec.onend = () => {
      if (id !== listenId) return;
      rec = null;
      const t = finalText.trim();
      if (t) { silentRounds = 0; submit(t); }
      else if (fatal || !isOpen) setState('idle');
      else if (++silentRounds >= 3) { silentRounds = 0; setState('idle'); }
      else setTimeout(() => id === listenId && listen(), 250);
    };
    try { rec.start(); } catch { setState('idle'); }
  }
  function onOrb() {
    if (state === 'speaking') { speechSynthesis.cancel(); listen(); }
    else if (state === 'listening') { stopListening(); setState('idle'); }
    else if (state === 'idle') { silentRounds = 0; listen(); }
  }

  // ---------- conversation ----------
  async function submit(text) {
    stopListening(); if (window.speechSynthesis) speechSynthesis.cancel();
    bubble('user', text);
    if (BYE.test(text.trim())) { await speak('Goodbye!'); close(); return; }
    setState('thinking');
    let data;
    try {
      const headers = { 'content-type': 'application/json' };
      if (o.getAuthToken) { const t = await o.getAuthToken(); if (t) headers.authorization = `Bearer ${t}`; }
      const res = await fetch(o.apiUrl.replace(/\/$/, '') + '/chat', { method: 'POST', headers, body: JSON.stringify({ sessionId: sid, text, lang }), ...(o.fetchOptions || {}) });
      data = await res.json().catch(() => ({}));
      if (!data.reply) data.reply = res.ok ? 'Sorry, I did not get that.' : 'Sorry, I could not reach the store right now.';
    } catch { data = { reply: 'I cannot reach the server. Please check your connection.', ui: [], actions: [] }; }
    bubble('bot', data.reply);
    for (const b of data.ui || []) { const el = render(b); if (el) feed.append(el); }
    scroll();
    for (const a of data.actions || []) { fire(a); if (a.type === 'navigate' && a.screen !== 'product') root.classList.add('jv-mini'); }
    await speak(data.reply);
    if (isOpen && data.expectReply) listen(); else setState('idle');
  }

  function open() {
    if (isOpen) { root.classList.remove('jv-mini'); return; }
    isOpen = true; stopWake(); root.classList.add('jv-open'); root.classList.remove('jv-mini');
    if (!SR) note('Voice input is not supported in this browser — you can type instead (Chrome or Edge recommended).');
    else if (!window.isSecureContext) note('The microphone only works on HTTPS or localhost.');
    if (!greeted) { greeted = true; const g = GREETING[lang] || GREETING['en-IN']; bubble('bot', g); speak(g).then(() => isOpen && listen()); }
    else listen();
  }
  function close() {
    isOpen = false; stopListening(); if (window.speechSynthesis) speechSynthesis.cancel();
    root.classList.remove('jv-open', 'jv-mini'); setState('idle'); startWake();
  }

  // ---------- optional wake word ----------
  function startWake() {
    if (!o.wakeWord || !SR || wakeRec || isOpen) return;
    const r = new SR(); wakeRec = r; r.continuous = true; r.interimResults = true; r.lang = 'en-IN';
    r.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (/\b(hey|hi|ok|okay)?\s*(jarvis|jarvish|service)\b/i.test(e.results[i][0].transcript) && /jarvis/i.test(e.results[i][0].transcript)) { stopWake(); open(); return; } };
    r.onend = () => { if (wakeRec === r) { wakeRec = null; setTimeout(startWake, 400); } };
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { o.wakeWord = false; } };
    try { r.start(); } catch { wakeRec = null; }
  }
  function stopWake() { if (wakeRec) { const r = wakeRec; wakeRec = null; try { r.onend = null; r.abort(); } catch {} } }

  // ---------- mic button (delegated, so it also works for buttons rendered later by React/Vue) ----------
  const onDocClick = (e) => {
    const b = o.micButton; if (!b) return;
    const hit = typeof b === 'string' ? e.target.closest && e.target.closest(b) : (b.contains && b.contains(e.target));
    if (hit && !root.contains(e.target)) { e.preventDefault(); e.stopPropagation(); open(); }
  };
  document.addEventListener('click', onDocClick, true);
  setState('idle');
  startWake();

  const api = { open, close, send: submit, destroy() { close(); document.removeEventListener('click', onDocClick, true); root.remove(); style.remove(); delete window.__jarvis; } };
  window.__jarvis = api;
  return api;
}
export default initJarvis;
