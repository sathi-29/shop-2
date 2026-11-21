// Offline tests: node test/run.js   (uses the keyword brain + mock data, no API key needed)
process.env.ADAPTER = 'mock';
const assert = require('assert');
const adapter = require('../server/adapter');
const mock = require('../server/llm/mock');
const { handleTurn } = require('../server/agent');
const { runTool } = require('../server/tools');
const { createVoiceAgentFallback, shouldUseGeneralFallback } = require('../server/voice_agent_fallback');

const user = { id: 'demo', name: 'Demo' };
let n = 0;
const say = async (sid, text) => { const o = await handleTurn({ sessionId: sid, text, lang: 'en-IN', user, adapter, llm: mock }); console.log(`  you: ${text}\n  jarvis: ${o.reply}${o.ui.length ? `   [ui: ${o.ui.map((u) => u.type).join(',')}]` : ''}`); return o; };
const test = async (name, fn) => { console.log(`\n# ${name}`); await fn(); n++; };

(async () => {
  await test('vague request -> asks a question, then shows a list', async () => {
    let o = await say('s1', 'I want shoes');
    assert(o.expectReply && !o.ui.length);
    o = await say('s1', 'Stride');
    assert(o.ui[0].type === 'products' && o.ui[0].items.every((p) => p.brand === 'Stride'));
  });
  await test('product question + add to cart needs size', async () => {
    let o = await say('s1', 'tell me about the first one');
    assert(o.ui[0].items[0].description);
    o = await say('s1', 'add the first one to my cart');
    assert(/size/i.test(o.reply));
    o = await say('s1', 'size 9');
    assert(o.ui.some((u) => u.type === 'cart') && o.actions.some((a) => a.type === 'cart_changed'));
  });
  await test('order requires explicit confirmation, then is placed', async () => {
    let o = await say('s1', 'place the order');
    assert(/address/i.test(o.reply), 'asks which address (user has two)');
    o = await say('s1', 'home');
    assert(o.ui.some((u) => u.type === 'order_summary'));
    o = await say('s1', 'yes');
    assert(o.ui.some((u) => u.type === 'order_placed') && o.actions.some((a) => a.type === 'order_placed'));
    assert((await adapter.getCart(user)).length === 0, 'cart emptied');
  });
  await test('confirm_order in the SAME turn as prepare_order is refused', async () => {
    const session = { turn: 5, pending: null, lastShown: [] };
    const ctx = { user, adapter, session };
    await runTool('add_to_cart', { product_id: 'p502', size: 'M' }, ctx);
    const prep = await runTool('prepare_order', { address_id: 'a1', payment_method: 'cod' }, ctx);
    const early = await runTool('confirm_order', { pending_id: prep.result.pending_id }, ctx);
    assert(early.result.error, 'must be refused');
    session.turn = 6;
    const ok = await runTool('confirm_order', { pending_id: prep.result.pending_id }, ctx);
    assert(ok.result.placed);
  });
  await test('tracking: several active orders -> asks which, then tracks', async () => {
    let o = await say('s2', 'where is my order');
    assert(/which/i.test(o.reply) && o.expectReply);
    o = await say('s2', 'the saree');
    assert(o.ui[0].type === 'tracking' && /Bengaluru sorting hub/.test(o.ui[0].currentLocation));
    console.log('  timeline events:', o.ui[0].events.length);
  });
  await test('no results is handled', async () => {
    const o = await say('s3', 'laptop bag');
    assert(/couldn't find/i.test(o.reply));
  });
  await test('session is bound to its user (no cross-user reuse)', async () => {
    const other = { id: 'someone-else', name: 'X' };
    const o = await handleTurn({ sessionId: 's1', text: 'yes', lang: 'en-IN', user: other, adapter, llm: mock });
    assert(!o.ui.some((u) => u.type === 'order_placed'));
  });
  await test('general questions use the fallback without stealing shop turns', async () => {
    assert(shouldUseGeneralFallback('What is a black hole?', false));
    assert(!shouldUseGeneralFallback('Where is my order?', false));
    assert(!shouldUseGeneralFallback('I want a bangle', false));
    assert(!shouldUseGeneralFallback('What is the first one?', true));
    assert(shouldUseGeneralFallback('What is a black hole?', true));
    assert(!shouldUseGeneralFallback('open calculator', false));
  });
  await test('voice-agent fallback is localhost-only and uses authenticated chat', async () => {
    let request;
    const bridge = createVoiceAgentFallback({
      url: 'http://127.0.0.1:8788',
      token: 'test-token',
      fetchImpl: async (url, options) => {
        request = { url: String(url), options };
        return { ok: true, json: async () => ({ reply: 'A general answer.' }) };
      },
    });
    const reply = await bridge.ask({ text: 'What is a black hole?', sessionId: 'session', userId: 'user' });
    assert.strictEqual(reply, 'A general answer.');
    assert.strictEqual(request.url, 'http://127.0.0.1:8788/v1/chat');
    assert.strictEqual(request.options.headers.authorization, 'Bearer test-token');
    assert(!request.options.body.includes('"user"'));
    assert.throws(
      () => createVoiceAgentFallback({ url: 'https://example.com', token: 'test-token' }),
      /localhost/,
    );
  });
  console.log(`\nAll ${n} test groups passed.`);
})().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
