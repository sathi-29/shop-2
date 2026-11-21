/**
 * CUSTOM ADAPTER – connect the assistant to the REAL e-commerce backend.
 *
 * Same function names and return shapes as server/adapter/mock.js. Implement each
 * one against your database or REST API, then set ADAPTER=custom in .env.
 *
 * Product: { id, brand, name, category, subcategory, price, mrp, rating, sizes[], colors[],
 *            description, inStock, image? }
 * Cart line: { productId, quantity, size, color }
 * Order: { id, status, placedAt, eta, deliveredAt?, paymentMethod, address,
 *          items[{productId,name,quantity,size,price}], total, carrier, trackingNumber,
 *          currentLocation, events[{status,label,location,time}] }
 *   status: placed | packed | shipped | in_transit | out_for_delivery | delivered | cancelled
 *
 * SECURITY: resolveUser(req) must verify the login token/cookie the website already
 * uses, and every cart/order function must only touch THAT user's data.
 */
module.exports = {
  async resolveUser(req) { throw new Error('TODO: verify req.headers.authorization, return { id, name }'); },
  async getCatalogInfo() { throw new Error('TODO: { brands[], categories[{name,subcategories[]}], priceRange{min,max,currency} }'); },
  async searchProducts(filters) { throw new Error('TODO: filters = { query, brand, category, subcategory, minPrice, maxPrice, sort }'); },
  async getProduct(id) { throw new Error('TODO'); },
  async getCart(user) { throw new Error('TODO'); },
  async addToCart(user, { productId, quantity, size, color }) { throw new Error('TODO'); },
  async removeFromCart(user, { productId }) { throw new Error('TODO'); },
  async getAddresses(user) { throw new Error('TODO: [{ id, label, line, isDefault }]'); },
  async getPaymentMethods(user) { throw new Error('TODO: [{ id, label, needsPaymentScreen? }]'); },
  async placeOrder(user, { lines, addressId, paymentMethod, total }) { throw new Error('TODO'); },
  async listOrders(user) { throw new Error('TODO'); },
  async getOrder(user, id) { throw new Error('TODO'); },
};
