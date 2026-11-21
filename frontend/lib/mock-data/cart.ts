import { availableFashionProducts } from "@/lib/mock-data/fashion-products";

export type FashionCart = Record<string, number>;

export const fashionCartStorageKey = "shopsphere-fashion-cart";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readFashionCart(): FashionCart {
  const serialized = window.localStorage.getItem(fashionCartStorageKey);
  if (!serialized) return {};

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)) {
      throw new TypeError("Saved cart data must be an object.");
    }

    const availableIds = new Set(
      availableFashionProducts.map((product) => product.id),
    );
    const cart: FashionCart = {};
    for (const [productId, quantity] of Object.entries(parsed)) {
      if (
        availableIds.has(productId) &&
        typeof quantity === "number" &&
        Number.isInteger(quantity) &&
        quantity > 0
      ) {
        cart[productId] = quantity;
      } else {
        console.error("Ignoring an invalid saved ShopSphere cart item.", {
          productId,
          quantity,
        });
      }
    }
    return cart;
  } catch (error) {
    console.error("Could not read the saved ShopSphere cart.", error);
    window.localStorage.removeItem(fashionCartStorageKey);
    return {};
  }
}

export function saveFashionCart(cart: FashionCart) {
  try {
    window.localStorage.setItem(fashionCartStorageKey, JSON.stringify(cart));
    return true;
  } catch (error) {
    console.error("Could not save the ShopSphere cart.", error);
    return false;
  }
}

export function getFashionCartCount(cart: FashionCart) {
  return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
}

export function getFashionCartProducts(cart: FashionCart) {
  return availableFashionProducts.flatMap((product) => {
    const quantity = cart[product.id];
    return quantity ? [{ product, quantity }] : [];
  });
}
