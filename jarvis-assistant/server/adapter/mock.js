/**
 * MOCK ADAPTER – sample catalogue, cart, addresses and orders so the assistant
 * works out of the box. Replace with server/adapter/custom.js for real data.
 * (Every function may be sync or async.)
 */
const DAY = 86400000;
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 3600000).toISOString();
const ahead = (d) => new Date(Date.now() + d * DAY).toISOString();

const PRODUCTS = [
  { id: 'p101', brand: 'Pitaraa', name: 'Pitaraa Golden Brass Bangle', category: 'Women', subcategory: 'Jewellery', price: 1199, mrp: 1799, rating: 4.4, sizes: ['2.4', '2.6', '2.8'], colors: ['Gold'], description: 'Handcrafted bead-textured brass bangle with an antique gold finish. Lightweight, nickel-free, tarnish-resistant coating.', inStock: true },
  { id: 'p102', brand: 'Pitaraa', name: 'Pitaraa Silver Oxidised Jhumkas', category: 'Women', subcategory: 'Jewellery', price: 899, mrp: 1299, rating: 4.2, sizes: [], colors: ['Silver'], description: 'Oxidised silver-tone jhumka earrings with floral carving. Push-back closure.', inStock: true },
  { id: 'p201', brand: 'Tonga', name: 'Tonga Maroon Top', category: 'Women', subcategory: 'Topwear', price: 1499, mrp: 2199, rating: 4.1, sizes: ['S', 'M', 'L', 'XL'], colors: ['Maroon'], description: 'Floral print wrap-style top in soft georgette with flutter sleeves. Machine washable.', inStock: true },
  { id: 'p202', brand: 'Tonga', name: 'Tonga Floral Cotton Kurti', category: 'Women', subcategory: 'Topwear', price: 1299, mrp: 1899, rating: 4.3, sizes: ['S', 'M', 'L', 'XL'], colors: ['Blue', 'Pink'], description: 'Straight-fit cotton kurti with block floral print and three-quarter sleeves.', inStock: true },
  { id: 'p203', brand: 'Tonga', name: 'Tonga Black Peplum Top', category: 'Women', subcategory: 'Topwear', price: 999, mrp: 1599, rating: 3.9, sizes: ['S', 'M', 'L'], colors: ['Black'], description: 'Peplum-style crepe top, round neck, cap sleeves.', inStock: false },
  { id: 'p301', brand: 'Weave & Co', name: 'Weave & Co Kanchipuram Style Silk Saree', category: 'Women', subcategory: 'Saree', price: 4299, mrp: 6999, rating: 4.6, sizes: [], colors: ['Red', 'Green'], description: 'Art-silk saree with woven zari border and contrast pallu. Comes with unstitched blouse piece.', inStock: true },
  { id: 'p302', brand: 'Weave & Co', name: 'Weave & Co Handloom Cotton Saree', category: 'Women', subcategory: 'Saree', price: 1899, mrp: 2599, rating: 4.5, sizes: [], colors: ['Yellow', 'Teal'], description: 'Breathable handloom cotton saree with temple border; soft after the first wash.', inStock: true },
  { id: 'p401', brand: 'Urbano', name: 'Urbano Court White Sneakers', category: 'Men', subcategory: 'Shoes', price: 3499, mrp: 4999, rating: 4.4, sizes: ['7', '8', '9', '10', '11'], colors: ['White'], description: 'Low-top synthetic leather sneakers with cushioned insole and rubber outsole.', inStock: true },
  { id: 'p402', brand: 'Urbano', name: 'Urbano Brown Leather Loafers', category: 'Men', subcategory: 'Shoes', price: 3899, mrp: 5499, rating: 4.3, sizes: ['7', '8', '9', '10'], colors: ['Brown'], description: 'Genuine leather slip-on loafers with a stitched sole. Formal and smart-casual.', inStock: true },
  { id: 'p403', brand: 'Stride', name: 'Stride Pro Running Shoes', category: 'Men', subcategory: 'Shoes', price: 2799, mrp: 3999, rating: 4.5, sizes: ['7', '8', '9', '10', '11'], colors: ['Black', 'Blue'], description: 'Breathable mesh running shoes with EVA midsole for daily training.', inStock: true },
  { id: 'p404', brand: 'Stride', name: 'Stride Flex Sports Shoes', category: 'Men', subcategory: 'Shoes', price: 1999, mrp: 2999, rating: 4.0, sizes: ['8', '9', '10'], colors: ['Grey'], description: 'Lightweight sports shoes, good for gym and walking.', inStock: true },
  { id: 'p501', brand: 'Ravel', name: 'Ravel Linen Blend Shirt', category: 'Men', subcategory: 'Topwear', price: 1299, mrp: 1999, rating: 4.2, sizes: ['M', 'L', 'XL', 'XXL'], colors: ['Beige', 'Sky Blue'], description: 'Regular-fit linen blend shirt, full sleeves. Ideal for summer.', inStock: true },
  { id: 'p502', brand: 'Ravel', name: 'Ravel Cotton Crew T-Shirt', category: 'Men', subcategory: 'Topwear', price: 699, mrp: 999, rating: 4.1, sizes: ['S', 'M', 'L', 'XL'], colors: ['Navy', 'White', 'Olive'], description: '100% cotton crew neck t-shirt, 180 GSM.', inStock: true },
];

const ADDRESSES = [
  { id: 'a1', label: 'Home', line: '12, 4th Cross, Indiranagar, Bengaluru 560038', isDefault: true },
  { id: 'a2', label: 'Office', line: 'Tech Park, Whitefield, Bengaluru 560066', isDefault: false },
];

const state = {}; // per-user state
function user(u) {
  if (!state[u.id]) {
    state[u.id] = {
      cart: [],
      orders: [
        { id: 'ORD-1001', status: 'packed', placedAt: ago(0, 3), eta: ahead(3), paymentMethod: 'cod', address: ADDRESSES[0].line,
          items: [{ productId: 'p403', name: 'Stride Pro Running Shoes', quantity: 1, size: '9', price: 2799 }], total: 2799,
          carrier: 'Ekart', trackingNumber: 'EK900112233', currentLocation: 'Seller warehouse, Bengaluru',
          events: [{ status: 'placed', label: 'Order placed', location: 'Online', time: ago(0, 3) }, { status: 'packed', label: 'Packed and ready for pickup', location: 'Seller warehouse, Bengaluru', time: ago(0, 1) }] },
        { id: 'ORD-1002', status: 'in_transit', placedAt: ago(3), eta: ahead(1), paymentMethod: 'upi', address: ADDRESSES[0].line,
          items: [{ productId: 'p301', name: 'Weave & Co Kanchipuram Style Silk Saree', quantity: 1, size: null, price: 4299 }, { productId: 'p102', name: 'Pitaraa Silver Oxidised Jhumkas', quantity: 1, size: null, price: 899 }], total: 5198,
          carrier: 'Delhivery', trackingNumber: 'DL778800991', currentLocation: 'Bengaluru sorting hub',
          events: [{ status: 'placed', label: 'Order placed', location: 'Online', time: ago(3) }, { status: 'packed', label: 'Packed', location: 'Chennai warehouse', time: ago(2, 18) }, { status: 'shipped', label: 'Shipped', location: 'Chennai hub', time: ago(2) }, { status: 'in_transit', label: 'Arrived at Bengaluru sorting hub', location: 'Bengaluru sorting hub', time: ago(0, 5) }] },
        { id: 'ORD-0987', status: 'delivered', placedAt: ago(14), eta: ago(9), deliveredAt: ago(9), paymentMethod: 'upi', address: ADDRESSES[0].line,
          items: [{ productId: 'p502', name: 'Ravel Cotton Crew T-Shirt', quantity: 2, size: 'L', price: 699 }], total: 1398,
          carrier: 'Ekart', trackingNumber: 'EK555000111', currentLocation: 'Delivered to customer',
          events: [{ status: 'placed', label: 'Order placed', location: 'Online', time: ago(14) }, { status: 'shipped', label: 'Shipped', location: 'Hyderabad hub', time: ago(12) }, { status: 'out_for_delivery', label: 'Out for delivery', location: 'Bengaluru', time: ago(9, 4) }, { status: 'delivered', label: 'Delivered', location: 'Bengaluru', time: ago(9) }] },
      ],
      seq: 1003,
    };
  }
  return state[u.id];
}

module.exports = {
  async resolveUser(_req) { return { id: 'demo', name: 'Demo User' }; },

  async getCatalogInfo() {
    const brands = {}, cats = {};
    for (const p of PRODUCTS) {
      brands[p.brand] = (brands[p.brand] || 0) + 1;
      (cats[p.category] = cats[p.category] || new Set()).add(p.subcategory);
    }
    const prices = PRODUCTS.map((p) => p.price);
    return {
      brands: Object.keys(brands),
      categories: Object.entries(cats).map(([name, s]) => ({ name, subcategories: [...s] })),
      priceRange: { min: Math.min(...prices), max: Math.max(...prices), currency: 'INR' },
    };
  },

  /** Returns products matching the structured filters; free-text `query` is matched here too. */
  async searchProducts({ query, brand, category, subcategory, minPrice, maxPrice, sort }) {
    const stop = new Set(['a', 'an', 'the', 'for', 'me', 'some', 'show', 'any', 'i', 'want', 'need', 'to', 'buy', 'of', 'in', 'and', 'with']);
    const tokens = String(query || '').toLowerCase().split(/[^a-z0-9&.]+/).filter((t) => t && !stop.has(t));
    const has = (s, v) => !v || String(s).toLowerCase().includes(String(v).toLowerCase());
    const list = PRODUCTS.filter((p) => {
      if (!has(p.brand, brand)) return false;
      if (category && !has(p.category, category) && !has(p.subcategory, category)) return false;
      if (!has(p.subcategory, subcategory)) return false;
      if (minPrice != null && p.price < minPrice) return false;
      if (maxPrice != null && p.price > maxPrice) return false;
      const hay = `${p.brand} ${p.name} ${p.category} ${p.subcategory} ${p.description} ${p.colors.join(' ')}`.toLowerCase();
      return tokens.every((t) => hay.includes(t) || hay.includes(t.replace(/s$/, '')));
    });
    if (sort === 'price_low') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_high') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  },

  async getProduct(id) { return PRODUCTS.find((p) => p.id === id) || null; },

  async getCart(u) { return user(u).cart.map((l) => ({ ...l })); },
  async addToCart(u, { productId, quantity = 1, size, color }) {
    const s = user(u);
    const line = s.cart.find((l) => l.productId === productId && l.size === (size || null) && l.color === (color || null));
    if (line) line.quantity += quantity;
    else s.cart.push({ productId, quantity, size: size || null, color: color || null });
    return s.cart.map((l) => ({ ...l }));
  },
  async removeFromCart(u, { productId }) {
    const s = user(u);
    s.cart = s.cart.filter((l) => l.productId !== productId);
    return s.cart.map((l) => ({ ...l }));
  },

  async getAddresses() { return ADDRESSES; },
  async getPaymentMethods() {
    return [{ id: 'cod', label: 'Cash on delivery' }, { id: 'upi', label: 'UPI (paid on the payment screen)', needsPaymentScreen: true }];
  },

  /** Create the order. lines: [{productId,name,quantity,size,color,price}] */
  async placeOrder(u, { lines, addressId, paymentMethod, total }) {
    const s = user(u);
    const addr = ADDRESSES.find((a) => a.id === addressId) || ADDRESSES[0];
    const id = `ORD-${s.seq++}`;
    const order = {
      id, status: 'placed', placedAt: new Date().toISOString(), eta: ahead(4), paymentMethod, address: addr.line,
      items: lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity, size: l.size, price: l.price })),
      total, carrier: null, trackingNumber: null, currentLocation: 'Order confirmed, waiting for the seller to pack it',
      events: [{ status: 'placed', label: 'Order placed', location: 'Online', time: new Date().toISOString() }],
    };
    s.orders.unshift(order);
    s.cart = s.cart.filter((c) => !lines.some((l) => l.productId === c.productId && l.size === c.size));
    return order;
  },

  async listOrders(u) { return user(u).orders.map((o) => ({ ...o })); },
  async getOrder(u, id) { return user(u).orders.find((o) => o.id.toLowerCase() === String(id).toLowerCase()) || null; },
};
