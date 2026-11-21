const { declarations, runTool } = require('./tools');
const { buildSystemPrompt } = require('./prompt');

const sessions = new Map();
const TTL = 30 * 60 * 1000;
const LANGS = { 'en-IN': 'English', 'en-US': 'English', 'hi-IN': 'Hindi', 'kn-IN': 'Kannada', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi' };

setInterval(() => { const now = Date.now(); for (const [k, s] of sessions) if (now - s.last > TTL) sessions.delete(k); }, 5 * 60 * 1000).unref();

function getSession(id, userId) {
  let s = sessions.get(id);
  if (!s || s.userId !== userId) { s = { userId, messages: [], turn: 0, pending: null, lastShown: [], last: Date.now() }; sessions.set(id, s); }
  s.last = Date.now();
  return s;
}
function trim(messages) { // keep the tail, always starting at a user message so tool pairs never split
  if (messages.length <= 40) return;
  let cut = messages.length - 30;
  while (cut < messages.length && messages[cut].role !== 'user') cut++;
  messages.splice(0, cut);
}

async function handleTurn({ sessionId, text, lang, user, adapter, llm }) {
  const session = getSession(sessionId, user.id);
  session.turn++;
  session.messages.push({ role: 'user', text: String(text).slice(0, 500) });
  const ctx = { user, adapter, session };
  const ui = [], actions = [];
  const system = buildSystemPrompt({ appName: process.env.APP_NAME || 'the store', userName: user.name, langName: LANGS[lang] || 'English', now: new Date().toString() });
  let reply = '';
  try {
    for (let step = 0; step < 7; step++) {
      const out = await llm.generate({ system, messages: session.messages, tools: declarations });
      session.messages.push({ role: 'assistant', text: out.text, toolCalls: out.toolCalls, raw: out.raw });
      if (!out.toolCalls.length) { reply = out.text; break; }
      const results = [];
      for (const c of out.toolCalls) {
        const r = await runTool(c.name, c.args, ctx);
        if (r.ui) ui.push(...r.ui);
        if (r.actions) actions.push(...r.actions);
        results.push({ id: c.id, name: c.name, result: r.result });
      }
      session.messages.push({ role: 'tool', results });
    }
    if (!reply) reply = 'Sorry, I got stuck on that. Could you say it again?';
  } catch (e) {
    console.error('[agent]', e.message);
    session.messages.pop(); // drop the failed turn's dangling user message state
    while (session.messages.length && session.messages[session.messages.length - 1].role !== 'assistant' && session.messages[session.messages.length - 1].role !== 'user') session.messages.pop();
    return { reply: "Sorry, I'm having trouble thinking right now. Please try again in a moment.", ui: [], actions: [], expectReply: false, error: true };
  }
  trim(session.messages);
  // Only the last cart card matters; keep order of the rest.
  const lastCart = ui.map((u) => u.type).lastIndexOf('cart');
  const cleanUi = ui.filter((u, i) => u.type !== 'cart' || i === lastCart);
  const bye = /\b(goodbye|bye)\b/i.test(reply) && !session.pending;
  return { reply, ui: cleanUi, actions, expectReply: !bye && (/[?？]\s*$/.test(reply) || !!session.pending) };
}
function resetSession(id) { sessions.delete(id); }
module.exports = { handleTurn, resetSession };
