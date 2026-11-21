export type ScreenGroup = "customer" | "seller" | "admin";

export type ScreenDefinition = {
  slug: string;
  name: string;
  group: ScreenGroup;
  sourceFolder: string;
  status: "pending" | "complete";
};

export const screens: ScreenDefinition[] = [
  {
    slug: "home-marketplace",
    name: "Home Marketplace",
    group: "customer",
    sourceFolder: "home_marketplace",
    status: "pending",
  },
  {
    slug: "mobile-home-reels-discovery",
    name: "Mobile Home Reels Discovery",
    group: "customer",
    sourceFolder: "mobile_home_reels_discovery",
    status: "pending",
  },
  {
    slug: "shoppable-video-reels-feed",
    name: "Shoppable Video Reels Feed",
    group: "customer",
    sourceFolder: "shoppable_video_reels_feed",
    status: "pending",
  },
  {
    slug: "ai-voice-shopping-assistant",
    name: "AI Voice Shopping Assistant",
    group: "customer",
    sourceFolder: "ai_voice_shopping_assistant",
    status: "pending",
  },
  {
    slug: "login",
    name: "Customer Login",
    group: "customer",
    sourceFolder: "customer_login",
    status: "pending",
  },
  {
    slug: "product-detail-aura-studio-anc-headphones",
    name: "Product Detail: Aura Studio ANC Headphones",
    group: "customer",
    sourceFolder: "product_detail_aura_studio_anc_headphones",
    status: "pending",
  },
  {
    slug: "my-cart",
    name: "My Cart",
    group: "customer",
    sourceFolder: "my_cart_shopsphere",
    status: "pending",
  },
  {
    slug: "checkout-voice-confirmation",
    name: "Checkout Voice Confirmation",
    group: "customer",
    sourceFolder: "checkout_voice_confirmation",
    status: "pending",
  },
  {
    slug: "order-confirmed",
    name: "Order Confirmed",
    group: "customer",
    sourceFolder: "order_confirmed_shopsphere",
    status: "pending",
  },
  {
    slug: "live-order-tracking",
    name: "Live Order Tracking",
    group: "customer",
    sourceFolder: "live_order_tracking_shopsphere",
    status: "pending",
  },
  {
    slug: "order-tracking-timeline",
    name: "Order Tracking Timeline",
    group: "customer",
    sourceFolder: "order_tracking_timeline",
    status: "pending",
  },
  {
    slug: "my-orders",
    name: "My Orders",
    group: "customer",
    sourceFolder: "my_orders",
    status: "pending",
  },
  {
    slug: "wishlist-saved-items",
    name: "Wishlist & Saved Items",
    group: "customer",
    sourceFolder: "wishlist_saved_items",
    status: "pending",
  },
  {
    slug: "return-refund-request",
    name: "Return & Refund Request",
    group: "customer",
    sourceFolder: "return_refund_request",
    status: "pending",
  },
  {
    slug: "profile-account",
    name: "Profile Account",
    group: "customer",
    sourceFolder: "profile_account_shopsphere",
    status: "pending",
  },
];
