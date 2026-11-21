import { initJarvis } from "/jarvis-widget.js";

const screens = {
  home: "/customer/home-marketplace",
  cart: "/customer/my-cart",
  orders: "/customer/my-orders",
  profile: "/customer/profile-account",
  reels: "/customer/shoppable-video-reels-feed",
  wishlist: "/customer/wishlist-saved-items",
  product: "/customer/product-detail-aura-studio-anc-headphones",
  checkout: "/customer/checkout-voice-confirmation",
  payment: "/customer/checkout-voice-confirmation",
};

function handleAction(action) {
  if (action.type === "navigate") {
    const path = screens[action.screen];
    if (!path) {
      console.warn("Jarvis requested an unsupported screen.", action.screen);
      return;
    }

    const query = new URLSearchParams();
    if (action.productId) query.set("productId", action.productId);
    if (action.orderId) query.set("orderId", action.orderId);
    if (action.screen === "payment") query.set("screen", "payment");
    const suffix = query.toString();
    window.dispatchEvent(
      new CustomEvent("shopsphere:navigate", {
        detail: `${path}${suffix ? `?${suffix}` : ""}`,
      }),
    );
    return;
  }

  if (action.type === "cart_changed") {
    window.dispatchEvent(new CustomEvent("shopsphere:cart-changed"));
    return;
  }

  window.dispatchEvent(
    new CustomEvent("shopsphere:order-placed", { detail: action }),
  );
}

initJarvis({
  apiUrl: "/api/assistant",
  micButton: "[data-jarvis-mic]",
  lang: "en-IN",
  currency: "₹",
  onAction: handleAction,
});