/**
 * Framework-neutral request handler. Works with plain Node http AND Express/Fastify-raw:
 *   Express:  app.use('/api/assistant', require('./jarvis-assistant/server/handler').createHandler());
 */
const { loadEnv } = require('./env');
loadEnv();
const adapter = require('./adapter');
const { createLLM } = require('./llm');
const { handleTurn, resetSession } = require('./agent');
const { createVoiceAgentFallback, shouldUseGeneralFallback } = require('./voice_agent_fallback');

const hits = new Map(); // tiny per-IP rate limit: 40 requests/minute
const SHOP_CONTEXT_TTL = 15 * 60 * 1000;
setInterval(() => hits.clear(), 60 * 1000).unref();

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let n = 0, buf = '';
    req.on('data', (c) => { n += c.length; if (n > 20000) { reject(new Error('too large')); req.destroy(); } else buf += c; });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function createHandler() {
  const llm = createLLM();
  const voiceAgentFallback = createVoiceAgentFallback({
    url: process.env.VOICE_AGENT_URL,
    token: process.env.VOICE_AGENT_TOKEN,
  });
  const shopContexts = new Map();
  console.log(`[jarvis] brain: ${llm.name}, data adapter: ${process.env.ADAPTER || 'mock'}`);
  return async function jarvisHandler(req, res, next) {
    const origin = process.env.ALLOWED_ORIGIN || '*';
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (origin !== '*') res.setHeader('vary', 'Origin');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    const path = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
    const route = path.endsWith('/chat') ? 'chat' : path.endsWith('/reset') ? 'reset' : path.endsWith('/health') ? 'health' : null;
    if (!route) { if (next) return next(); return send(res, 404, { error: 'not found' }); }
    if (route === 'health') return send(res, 200, { ok: true, brain: llm.name });
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    const ip = req.socket?.remoteAddress || 'x';
    hits.set(ip, (hits.get(ip) || 0) + 1);
    if (hits.get(ip) > 40) return send(res, 429, { error: 'Too many requests', reply: 'Please slow down a little.' });
    try {
      const body = await readBody(req);
      const user = await adapter.resolveUser(req);
      if (!user || !user.id) return send(res, 401, { error: 'Not logged in', reply: 'Please log in first so I can help with your account.' });
      const sessionId = String(body.sessionId || '').slice(0, 64);
      if (!sessionId) return send(res, 400, { error: 'sessionId required' });
      const contextKey = `${user.id}:${sessionId}`;
      if (route === 'reset') {
        resetSession(sessionId);
        shopContexts.delete(contextKey);
        if (voiceAgentFallback) await voiceAgentFallback.reset({ sessionId, userId: user.id });
        return send(res, 200, { ok: true });
      }
      if (!body.text || !String(body.text).trim()) return send(res, 400, { error: 'text required' });
      const now = Date.now();
      for (const [key, updatedAt] of shopContexts) {
        if (now - updatedAt > SHOP_CONTEXT_TTL) shopContexts.delete(key);
      }
      const hasRecentShopContext = now - (shopContexts.get(contextKey) || 0) <= SHOP_CONTEXT_TTL;
      if (voiceAgentFallback && shouldUseGeneralFallback(body.text, hasRecentShopContext)) {
        try {
          const reply = await voiceAgentFallback.ask({
            text: body.text,
            sessionId,
            userId: user.id,
            lang: body.lang,
          });
          return send(res, 200, { reply, ui: [], actions: [], expectReply: false });
        } catch (error) {
          console.error('[voice-agent fallback]', error);
          return send(res, 502, {
            error: 'general assistant unavailable',
            reply: "I can't reach the general assistant right now. Please try again.",
          });
        }
      }
      const out = await handleTurn({ sessionId, text: body.text, lang: body.lang, user, adapter, llm });
      if ((out.ui && out.ui.length) || out.expectReply || (out.actions && out.actions.length)) {
        shopContexts.set(contextKey, now);
      }
      return send(res, 200, out);
    } catch (e) {
      console.error('[jarvis]', e);
      return send(res, 500, { error: 'server error', reply: 'Sorry, something went wrong on my side.' });
    }
  };
}
module.exports = { createHandler };
