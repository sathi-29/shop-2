/**
 * Keyword "brain" used only when no API key is configured (demo / tests).
 * It is NOT smart: it exists so the whole pipeline (tools, UI cards, ordering
 * gate, tracking) can be demonstrated offline. Add a Gemini key for the real thing.
 */
const lastToolResult = (messages, name) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'tool') { const r = m.results.find((x) => x.name === name); if (r) return r.result; }
  }
  return null;
};
const lastAssistantText = (messages) => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return ''; };
const call = (name, args = {}) => ({ text: '', toolCalls: [{ id: `m${Math.random().toString(36).slice(2)}`, name, args }] });
const say = (text) => ({ text, toolCalls: [] });
const ORD = { first: 0, '1st': 0, one: 0, second: 1, '2nd': 1, two: 1, third: 2, '3rd': 2, three: 2, fourth: 3, fifth: 4 };

function pendingOrder(messages) {
  let pend = null;
  for (const m of messages) if (m.role === 'tool') for (const r of m.results) {
    if (r.name === 'prepare_order' && r.result?.pending_id) pend = r.result.pending_id;
    if (['confirm_order', 'cancel_pending_order'].includes(r.name)) pend = null;
  }
  return pend;
}
function shown(messages) { // last list shown by search
  const r = lastToolResult(messages, 'search_products') || lastToolResult(messages, 'get_product_details');
  if (!r) return [];
  return r.showing || (r.product_id ? [{ position: 1, product_id: r.product_id, name: r.name, sizes: r.sizes }] : []);
}
function pick(text, list) {
  for (const [w, i] of Object.entries(ORD)) if (new RegExp(`\\b${w}\\b`).test(text) && list[i]) return list[i];
  return list.find((p) => text.includes((p.name || '').toLowerCase().split(' ').slice(0, 2).join(' '))) || (list.length === 1 ? list[0] : null);
}

function summarize(messages) {
  const last = messages[messages.length - 1];
  const r = last.results[0].result, name = last.results[0].name;
  if (r.error) return say(r.error === 'size_required' ? `Which size would you like? Available: ${r.available_sizes.join(', ')}.` : `Sorry, ${String(r.error).replace(/_/g, ' ')}.`);
  switch (name) {
    case 'search_products':
      if (!r.total_found) return say("I couldn't find a match. Want to try a different brand or category?");
      return say(`I found ${r.total_found} options. Top pick is ${r.showing[0].name} at ${r.showing[0].price_inr} rupees. Want details, or shall I add one to your cart?`);
    case 'get_product_details': return say(`${r.name}: ${r.description} It costs ${r.price_inr} rupees, rated ${r.rating}.${r.sizes?.length ? ` Sizes: ${r.sizes.join(', ')}.` : ''} Shall I add it to your cart?`);
    case 'add_to_cart': return say(`Added ${r.added}. Your cart total is ${r.cart_subtotal_inr} rupees. Would you like to order now?`);
    case 'view_cart': return say(r.empty ? 'Your cart is empty.' : `You have ${r.items.length} item(s), ${r.subtotal_inr} rupees. Shall I place the order?`);
    case 'prepare_order':
      if (r.needs === 'address') return say('Which address: ' + r.addresses.map((a) => a.label).join(' or ') + '?');
      if (r.needs === 'payment_method') return say('How would you like to pay: ' + r.options.map((o) => o.label).join(' or ') + '?');
      if (r.needs === 'size') return say(`Which size? ${r.available_sizes.join(', ')}.`);
      return say(`${r.items.join(', ')}, total ${r.total_inr} rupees, to ${r.deliver_to}, paying by ${r.payment}. Shall I place this order?`);
    case 'confirm_order': return say(`Done, your order ${r.order_id} is placed for ${r.total_inr} rupees.`);
    case 'cancel_pending_order': return say('Okay, I cancelled that. What would you like to change?');
    case 'list_orders': {
      const active = r.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
      if (!r.count) return say("You don't have any orders yet.");
      if (active.length === 1) return call('track_order', { order_id: active[0].order_id });
      if (active.length > 1) return say(`You have ${active.length} orders on the way: ${active.map((o) => o.items[0].replace(/^\d+ x /, '')).join(' and ')}. Which one should I track?`);
      return say(`Nothing is on the way. Your latest order, ${r.orders[0].order_id}, was ${r.orders[0].status}.`);
    }
    case 'track_order': return say(`${r.status_text}. It is currently at ${r.current_location}${r.expected_delivery ? ` and expected by ${new Date(r.expected_delivery).toDateString()}` : ''}.`);
    default: return say('Done.');
  }
}

module.exports = {
  name: 'mock-keyword-brain',
  async generate({ messages }) {
    const last = messages[messages.length - 1];
    if (last.role === 'tool') return summarize(messages);
    const t = last.text.toLowerCase().trim();
    const pend = pendingOrder(messages);
    if (/^(bye|goodbye|stop|thanks?|thank you)\b/.test(t)) return say('Goodbye! Tap the mic any time.');
    if (pend && /^(yes|yeah|yep|yup|sure|ok|okay|confirm|place it|go ahead|haan)\b/.test(t)) return call('confirm_order', { pending_id: pend });
    if (pend && /^(no|nope|cancel|wait)\b/.test(t)) return call('cancel_pending_order');
    // answers to "which order?"
    const lo = lastToolResult(messages, 'list_orders');
    if (lo && /which one should i track/i.test(lastAssistantText(messages))) {
      const o = lo.orders.find((x) => x.items.some((i) => t.split(/\W+/).some((w) => w.length > 3 && i.toLowerCase().includes(w)))) || lo.orders[ORD[t.split(/\W+/).find((w) => w in ORD)]];
      if (o) return call('track_order', { order_id: o.order_id });
    }
    const asked = lastAssistantText(messages);
    if (/which size/i.test(asked) && /\b(s|m|l|xl|xxl|\d+(\.\d)?)\b/.test(t)) {
      const size = (t.match(/\b(xxl|xl|s|m|l|\d+(?:\.\d)?)\b/) || [])[1];
      const p = shown(messages)[0]; if (p) return call('add_to_cart', { product_id: p.product_id, size: size.toUpperCase() });
    }
    if (/which address/i.test(asked)) return call('prepare_order', { address_id: /office/.test(t) ? 'a2' : 'a1', payment_method: 'cod' });
    if (/how would you like to pay/i.test(asked)) return call('prepare_order', { address_id: 'a1', payment_method: /upi/.test(t) ? 'upi' : 'cod' });
    if (/\b(track|where is|where's|status|my orders?|delivery)\b/.test(t)) return call('list_orders');
    if (/\b(cart|basket)\b/.test(t) && !/\badd\b/.test(t)) return call('view_cart');
    if (/\b(place|buy|checkout|order)\b/.test(t) && /\b(order|checkout|cart|place)\b/.test(t)) return call('prepare_order', { payment_method: /upi/.test(t) ? 'upi' : /cash|cod/.test(t) ? 'cod' : undefined });
    const list = shown(messages);
    if (/\badd\b/.test(t)) { const p = pick(t, list) || list[0]; if (p) { const size = (t.match(/\bsize\s*(\w+)/) || [])[1]; return call('add_to_cart', { product_id: p.product_id, size: size && size.toUpperCase() }); } return say('Which product should I add?'); }
    if (/\b(details?|tell me|about|material|sizes?|colou?rs?)\b/.test(t) && list.length) { const p = pick(t, list) || list[0]; return call('get_product_details', { product_id: p.product_id }); }
    if (/\b(any|all|you choose|show me everything)\b/.test(t) && /brand|budget|type|which/i.test(asked)) {
      const prevUser = [...messages].reverse().filter((m) => m.role === 'user').slice(1)[0];
      return call('search_products', { query: prevUser ? prevUser.text : '' });
    }
    const words = t.replace(/[^a-z0-9& ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['show', 'want', 'need', 'looking', 'for', 'some', 'the', 'find', 'get', 'please'].includes(w));
    if (!words.length) return say('Hi, I am Jarvis. What are you looking for today?');
    const brands = ['pitaraa', 'tonga', 'urbano', 'stride', 'ravel', 'weave'];
    if (words.length === 1 && !brands.includes(words[0])) return say(`Sure, ${words[0]}. Any particular brand or budget in mind?`);
    return call('search_products', { query: words.join(' ') });
  },
};
