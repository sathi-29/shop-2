/**
 * Tool definitions the LLM can call + their handlers.
 * Handlers get (args, ctx) and return { result, ui?, actions? }:
 *   result  -> JSON the model sees
 *   ui      -> cards the web widget renders (lists, tracking timeline...)
 *   actions -> things the website should do (navigate, refresh cart...)
 * All data access goes through ctx.adapter, so this file never changes when you
 * connect the real backend.
 */
const money = (n) => Math.round(n);
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 49);
const FREE_DELIVERY_ABOVE = Number(process.env.FREE_DELIVERY_ABOVE || 999);

const toCard = (p, position) => ({
  position, id: p.id, brand: p.brand, name: p.name, category: p.category, subcategory: p.subcategory,
  price: p.price, mrp: p.mrp, discountPct: p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0,
  rating: p.rating, image: p.image || null, inStock: p.inStock !== false,
});
const toLLM = (p, position) => ({
  position, product_id: p.id, brand: p.brand, name: p.name, category: p.category, subcategory: p.subcategory,
  price_inr: p.price, mrp_inr: p.mrp, rating: p.rating, in_stock: p.inStock !== false,
});

async function cartDetail(ctx) {
  const lines = await ctx.adapter.getCart(ctx.user);
  const out = [];
  for (const l of lines) {
    const p = await ctx.adapter.getProduct(l.productId);
    if (p) out.push({ productId: p.id, name: p.name, brand: p.brand, image: p.image || null, price: p.price, quantity: l.quantity, size: l.size || null, color: l.color || null, inStock: p.inStock !== false });
  }
  const subtotal = out.reduce((s, l) => s + l.price * l.quantity, 0);
  return { lines: out, subtotal };
}

function pricing(lines) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const delivery = subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0 ? 0 : DELIVERY_FEE;
  return { subtotal: money(subtotal), delivery, total: money(subtotal + delivery) };
}

const ORDER_STATUS_TEXT = {
  placed: 'Order placed, the seller is getting it ready', packed: 'Packed, waiting for the courier to pick it up',
  shipped: 'Shipped', in_transit: 'On its way', out_for_delivery: 'Out for delivery today', delivered: 'Delivered', cancelled: 'Cancelled',
};
const orderBrief = (o) => ({
  order_id: o.id, status: o.status, status_text: ORDER_STATUS_TEXT[o.status] || o.status, placed_at: o.placedAt,
  expected_delivery: o.status === 'delivered' || o.status === 'cancelled' ? null : o.eta, delivered_at: o.deliveredAt || null,
  items: o.items.map((i) => `${i.quantity} x ${i.name}`), total_inr: o.total,
});

const defs = [
  {
    name: 'get_catalog_info',
    description: 'Get the brands, categories/sub-categories and price range available in the store. Use it to ask good follow-up questions or to suggest alternatives.',
    parameters: { type: 'object', properties: {} },
    async run(_a, ctx) { return { result: await ctx.adapter.getCatalogInfo() }; },
  },
  {
    name: 'search_products',
    description: 'Search the store. Shows the matching products as a list on the customer screen. Use only once you know enough (type, and ideally brand/budget).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text, e.g. "golden bangle", "running shoes"' },
        brand: { type: 'string' },
        category: { type: 'string', description: 'Women, Men, or a sub-category like Jewellery' },
        subcategory: { type: 'string', description: 'e.g. Shoes, Topwear, Saree, Jewellery' },
        min_price: { type: 'number' }, max_price: { type: 'number' },
        sort: { type: 'string', enum: ['relevance', 'price_low', 'price_high', 'rating'] },
      },
    },
    async run(a, ctx) {
      const all = await ctx.adapter.searchProducts({ query: a.query, brand: a.brand, category: a.category, subcategory: a.subcategory, minPrice: a.min_price, maxPrice: a.max_price, sort: a.sort });
      const shown = all.slice(0, 6);
      ctx.session.lastShown = shown.map((p) => p.id);
      if (!shown.length) return { result: { total_found: 0, note: 'No products matched. Suggest relaxing a filter or another brand/category.' } };
      return {
        result: { total_found: all.length, showing: shown.map((p, i) => toLLM(p, i + 1)), note: 'The list is now displayed on screen.' },
        ui: [{ type: 'products', title: `${all.length} result${all.length > 1 ? 's' : ''}`, items: shown.map((p, i) => toCard(p, i + 1)) }],
      };
    },
  },
  {
    name: 'get_product_details',
    description: 'Full details of one product (description, sizes, colours, price, discount, rating, stock). Also displays the product on screen.',
    parameters: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] },
    async run(a, ctx) {
      const p = await ctx.adapter.getProduct(a.product_id);
      if (!p) return { result: { error: 'Product not found' } };
      return {
        result: { product_id: p.id, brand: p.brand, name: p.name, category: p.category, subcategory: p.subcategory, price_inr: p.price, mrp_inr: p.mrp, rating: p.rating, sizes: p.sizes, colors: p.colors, in_stock: p.inStock !== false, description: p.description },
        ui: [{ type: 'products', title: 'Product', items: [{ ...toCard(p, 1), description: p.description, sizes: p.sizes, colors: p.colors }] }],
      };
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the cart. If the product has sizes/colours, ask the customer which one first.',
    parameters: { type: 'object', properties: { product_id: { type: 'string' }, quantity: { type: 'integer' }, size: { type: 'string' }, color: { type: 'string' } }, required: ['product_id'] },
    async run(a, ctx) {
      const p = await ctx.adapter.getProduct(a.product_id);
      if (!p) return { result: { error: 'Product not found' } };
      if (p.inStock === false) return { result: { error: 'Out of stock' } };
      if (p.sizes && p.sizes.length && !a.size) return { result: { error: 'size_required', available_sizes: p.sizes } };
      if (a.size && p.sizes && p.sizes.length && !p.sizes.map(String).includes(String(a.size))) return { result: { error: 'invalid_size', available_sizes: p.sizes } };
      if (a.color && p.colors && p.colors.length && !p.colors.map((c) => c.toLowerCase()).includes(String(a.color).toLowerCase())) return { result: { error: 'invalid_color', available_colors: p.colors } };
      await ctx.adapter.addToCart(ctx.user, { productId: p.id, quantity: Math.max(1, a.quantity || 1), size: a.size, color: a.color });
      const cart = await cartDetail(ctx);
      return {
        result: { added: p.name, cart_items: cart.lines.reduce((s, l) => s + l.quantity, 0), cart_subtotal_inr: cart.subtotal },
        ui: [{ type: 'cart', ...cart }], actions: [{ type: 'cart_changed' }],
      };
    },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove a product from the cart.',
    parameters: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] },
    async run(a, ctx) {
      await ctx.adapter.removeFromCart(ctx.user, { productId: a.product_id });
      const cart = await cartDetail(ctx);
      return { result: { removed: true, cart_items: cart.lines.length, cart_subtotal_inr: cart.subtotal }, ui: [{ type: 'cart', ...cart }], actions: [{ type: 'cart_changed' }] };
    },
  },
  {
    name: 'view_cart',
    description: 'Show what is in the cart.',
    parameters: { type: 'object', properties: {} },
    async run(_a, ctx) {
      const cart = await cartDetail(ctx);
      return { result: { items: cart.lines.map((l) => ({ product_id: l.productId, name: l.name, quantity: l.quantity, size: l.size, price_inr: l.price })), subtotal_inr: cart.subtotal, empty: !cart.lines.length }, ui: [{ type: 'cart', ...cart }] };
    },
  },
  {
    name: 'prepare_order',
    description: 'Start an order from the cart, or a single product ("buy now" if product_id is given). Returns a summary to read back for confirmation, or says what is still missing (size, address, payment method). Does NOT place the order.',
    parameters: {
      type: 'object',
      properties: { product_id: { type: 'string', description: 'Only for buy-now of one product; omit to use the whole cart' }, quantity: { type: 'integer' }, size: { type: 'string' }, color: { type: 'string' }, address_id: { type: 'string' }, payment_method: { type: 'string', description: 'Id from the payment methods list, e.g. cod or upi' } },
    },
    async run(a, ctx) {
      let lines = [];
      if (a.product_id) {
        const p = await ctx.adapter.getProduct(a.product_id);
        if (!p) return { result: { error: 'Product not found' } };
        if (p.inStock === false) return { result: { error: 'Out of stock' } };
        if (p.sizes && p.sizes.length && !a.size) return { result: { needs: 'size', available_sizes: p.sizes } };
        lines = [{ productId: p.id, name: p.name, price: p.price, quantity: Math.max(1, a.quantity || 1), size: a.size || null, color: a.color || null }];
      } else {
        const cart = await cartDetail(ctx);
        if (!cart.lines.length) return { result: { error: 'The cart is empty' } };
        const oos = cart.lines.find((l) => !l.inStock);
        if (oos) return { result: { error: `${oos.name} is out of stock; remove it first` } };
        lines = cart.lines.map((l) => ({ productId: l.productId, name: l.name, price: l.price, quantity: l.quantity, size: l.size, color: l.color }));
      }
      const addresses = await ctx.adapter.getAddresses(ctx.user);
      if (!addresses.length) return { result: { error: 'No saved delivery address. Ask the customer to add one in the app.' }, actions: [{ type: 'navigate', screen: 'profile' }] };
      let address = addresses.find((x) => x.id === a.address_id);
      if (!address && addresses.length === 1) address = addresses[0];
      if (!address) return { result: { needs: 'address', addresses: addresses.map((x) => ({ address_id: x.id, label: x.label, line: x.line, is_default: !!x.isDefault })) } };
      const methods = await ctx.adapter.getPaymentMethods(ctx.user);
      const method = methods.find((m) => m.id === a.payment_method);
      if (!method) return { result: { needs: 'payment_method', options: methods.map((m) => ({ id: m.id, label: m.label })) } };
      const price = pricing(lines);
      const pending = { id: `pend_${Date.now().toString(36)}`, turn: ctx.session.turn, lines, addressId: address.id, address, paymentMethod: method, ...price };
      ctx.session.pending = pending;
      return {
        result: {
          pending_id: pending.id, items: lines.map((l) => `${l.quantity} x ${l.name}${l.size ? ` (size ${l.size})` : ''}`), subtotal_inr: price.subtotal, delivery_fee_inr: price.delivery, total_inr: price.total,
          deliver_to: `${address.label}: ${address.line}`, payment: method.label, next_step: 'Read this back briefly and ask the customer to confirm. Call confirm_order only after they say yes in their next message.',
        },
        ui: [{ type: 'order_summary', lines: lines.map((l) => ({ name: l.name, quantity: l.quantity, size: l.size, price: l.price })), ...price, address: `${address.label}: ${address.line}`, payment: method.label }],
      };
    },
  },
  {
    name: 'confirm_order',
    description: 'Place the prepared order. ONLY after the customer explicitly said yes to the read-back summary in their latest message.',
    parameters: { type: 'object', properties: { pending_id: { type: 'string' } }, required: ['pending_id'] },
    async run(a, ctx) {
      const pend = ctx.session.pending;
      if (!pend || pend.id !== a.pending_id) return { result: { error: 'No matching pending order. Call prepare_order first.' } };
      if (ctx.session.turn <= pend.turn) return { result: { error: 'Not confirmed yet. Read the summary to the customer and wait for their yes in their next message.' } };
      const order = await ctx.adapter.placeOrder(ctx.user, { lines: pend.lines, addressId: pend.addressId, paymentMethod: pend.paymentMethod.id, total: pend.total });
      ctx.session.pending = null;
      const actions = [{ type: 'cart_changed' }, { type: 'order_placed', orderId: order.id }];
      if (pend.paymentMethod.needsPaymentScreen) actions.push({ type: 'navigate', screen: 'payment', orderId: order.id });
      return {
        result: { placed: true, order_id: order.id, total_inr: pend.total, expected_delivery: order.eta, payment: pend.paymentMethod.label, payment_screen_opened: !!pend.paymentMethod.needsPaymentScreen },
        ui: [{ type: 'order_placed', orderId: order.id, total: pend.total, eta: order.eta, payment: pend.paymentMethod.label }], actions,
      };
    },
  },
  {
    name: 'cancel_pending_order',
    description: 'Discard the order being prepared because the customer said no or wants changes.',
    parameters: { type: 'object', properties: {} },
    async run(_a, ctx) { ctx.session.pending = null; return { result: { cancelled: true } }; },
  },
  {
    name: 'list_orders',
    description: "List the customer's orders (newest first). Use first for any tracking question.",
    parameters: { type: 'object', properties: { only_active: { type: 'boolean', description: 'true = hide delivered/cancelled' } } },
    async run(a, ctx) {
      let orders = (await ctx.adapter.listOrders(ctx.user)).sort((x, y) => new Date(y.placedAt) - new Date(x.placedAt));
      if (a.only_active) orders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
      const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
      return {
        result: { count: orders.length, active_count: active, orders: orders.slice(0, 8).map(orderBrief) },
        ui: [{ type: 'orders', items: orders.slice(0, 8).map((o) => ({ ...orderBrief(o), status_text: ORDER_STATUS_TEXT[o.status] })) }],
      };
    },
  },
  {
    name: 'track_order',
    description: 'Live tracking of one order: status, current location, courier, expected delivery and timeline.',
    parameters: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] },
    async run(a, ctx) {
      const o = await ctx.adapter.getOrder(ctx.user, a.order_id);
      if (!o) return { result: { error: 'Order not found for this customer' } };
      const t = {
        ...orderBrief(o), current_location: o.currentLocation, courier: o.carrier, tracking_number: o.trackingNumber,
        timeline: (o.events || []).map((e) => ({ label: e.label, location: e.location, time: e.time })),
      };
      return { result: t, ui: [{ type: 'tracking', orderId: o.id, status: o.status, statusText: ORDER_STATUS_TEXT[o.status], currentLocation: o.currentLocation, courier: o.carrier, eta: t.expected_delivery, deliveredAt: o.deliveredAt || null, items: t.items, events: o.events || [] }] };
    },
  },
  {
    name: 'navigate',
    description: 'Open a screen in the app, only when the customer asks to go there.',
    parameters: { type: 'object', properties: { screen: { type: 'string', enum: ['home', 'cart', 'orders', 'profile', 'reels', 'wishlist', 'product', 'checkout'] }, product_id: { type: 'string' } }, required: ['screen'] },
    async run(a) { return { result: { opened: a.screen }, actions: [{ type: 'navigate', screen: a.screen, productId: a.product_id || null }] }; },
  },
];

const byName = Object.fromEntries(defs.map((d) => [d.name, d]));
const declarations = defs.map(({ name, description, parameters }) => ({ name, description, parameters }));

async function runTool(name, args, ctx) {
  const t = byName[name];
  if (!t) return { result: { error: `Unknown tool ${name}` } };
  try { return await t.run(args || {}, ctx); }
  catch (e) { console.error(`[tool ${name}]`, e); return { result: { error: 'The store system had a problem. Apologise and offer to try again.' } }; }
}
module.exports = { declarations, runTool };
