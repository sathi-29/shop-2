"use client";

import { useEffect, useRef } from "react";
import { demoOrder, formatOrderAmount } from "@/lib/mock-data/order";
import {
  availableFashionProducts,
  fashionProducts,
} from "@/lib/mock-data/fashion-products";
import {
  FashionCart,
  getFashionCartCount,
  getFashionCartProducts,
  readFashionCart,
  saveFashionCart,
} from "@/lib/mock-data/cart";
import {
  convertUsdToInr,
  formatInr,
  shopLocale,
} from "@/lib/mock-data/locale";

type ScreenRendererProps = {
  bodyClass: string;
  markup: string;
  screenSlug: string;
  styles: string;
  scripts: string[];
};

const customerLinks: Record<string, string> = {
  home: "/customer/home-marketplace",
  "home-explore": "/customer/home-marketplace",
  "categories-browse": "/customer/home-marketplace",
  reels: "/customer/shoppable-video-reels-feed",
  "shoppable-video-reels-feed": "/customer/shoppable-video-reels-feed",
  cart: "/customer/my-cart",
  "shopping-cart": "/customer/my-cart",
  profile: "/customer/profile-account",
  "profile-account": "/customer/profile-account",
  orders: "/customer/my-orders",
  wishlist: "/customer/wishlist-saved-items",
  "wishlist-saved": "/customer/wishlist-saved-items",
  tracking: "/customer/live-order-tracking",
  returns: "/customer/return-refund-request",
  product: "/customer/product-detail-aura-studio-anc-headphones",
  checkout: "/customer/checkout-voice-confirmation",
};

const textLinks: Array<[RegExp, string]> = [
  [/seller hub login/i, "/seller"],
  [/admin console login/i, "/admin"],
  [/wishlist|saved items/i, "/customer/wishlist-saved-items"],
  [/my orders|order history/i, "/customer/my-orders"],
  [/return|refund/i, "/customer/return-refund-request"],
  [/track order|track package|order details/i, "/customer/live-order-tracking"],
  [/view product|product details|^details$/i, "/customer/product-detail-aura-studio-anc-headphones"],
  [/checkout|continue to checkout/i, "/customer/checkout-voice-confirmation"],
  [/continue shopping|^explore$|^browse$|^home$/i, "/customer/home-marketplace"],
];

const cartItemTemplates = new WeakMap<HTMLElement, HTMLElement>();

function setElementVisible(element: HTMLElement, visible: boolean) {
  element.hidden = !visible;
  element.style.display = visible ? "" : "none";
}

function replaceText(root: HTMLElement, replacements: Array<[string, string]>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const originalText = node.textContent ?? "";
    const replacement = replacements.find(([source]) =>
      originalText.includes(source),
    );
    if (replacement) {
      node.textContent = originalText.replaceAll(
        replacement[0],
        replacement[1],
      );
    }
    node = walker.nextNode();
  }
}

function syncOrderDetails(root: HTMLElement, screenSlug: string) {
  if (screenSlug === "checkout-voice-confirmation") {
    replaceText(root, [
      ["$299.00", formatOrderAmount(demoOrder.subtotalCents)],
      ["$326.40", formatOrderAmount(demoOrder.totalCents)],
      ["Tomorrow by 2 PM", demoOrder.deliveryShort],
      ["Tomorrow, 2 PM", demoOrder.deliveryLong],
      ["Headphones", demoOrder.items[0].trackingName],
      ["Keyboard", demoOrder.items[1].trackingName],
      ["Watch", demoOrder.items[2].trackingName],
    ]);
  }

  if (screenSlug === "live-order-tracking") {
    replaceText(root, [
      ["$438.50", formatOrderAmount(demoOrder.totalCents)],
      ["$249.00", formatOrderAmount(demoOrder.items[0].priceCents)],
      ["$129.50", formatOrderAmount(demoOrder.items[1].priceCents)],
      ["$60.00", formatOrderAmount(demoOrder.items[2].priceCents)],
      ["Ceramic Smart Watch band", demoOrder.items[2].trackingName],
    ]);
  }
}

function updateProductCard(
  card: HTMLElement,
  product: (typeof fashionProducts.flashDeals)[number],
  isFlashDeal: boolean,
) {
  const image = card.querySelector<HTMLImageElement>("img");
  if (image) {
    image.src = product.image;
    image.alt = product.name;
    image.dataset.alt = product.name;
  }

  const name = card.querySelector<HTMLElement>("h4");
  if (name) name.textContent = product.name;
  const addButton = card.querySelector<HTMLButtonElement>(
    'button[aria-label="Add to cart"], button[aria-label="Quick Add"]',
  );
  if (addButton) {
    addButton.dataset.productId = product.id;
    addButton.disabled = !product.available;
    if (!product.available) {
      addButton.setAttribute("aria-label", "Unavailable");
      addButton.textContent = "Unavailable";
    }
  }

  const priceElements = Array.from(
    card.querySelectorAll<HTMLElement>("span"),
  ).filter((element) => /^\$\s?[\d,]+/.test(element.textContent?.trim() ?? ""));
  if (priceElements[0]) {
    priceElements[0].textContent = formatInr(product.demoPriceInr);
  }
  if (priceElements[1] && product.demoOriginalPriceInr) {
    priceElements[1].textContent = formatInr(product.demoOriginalPriceInr);
  }

  if (isFlashDeal) {
    const details = name?.previousElementSibling;
    if (details instanceof HTMLElement) {
      details.textContent = `${product.gender} · ${product.subCategory}`;
    }
    const discountBadge = card.querySelector<HTMLElement>("span.absolute");
    if (discountBadge && product.demoOriginalPriceInr) {
      const discount = Math.round(
        (1 - product.demoPriceInr / product.demoOriginalPriceInr) * 100,
      );
      discountBadge.textContent = `-${discount}%`;
    }
    return;
  }

  const badge = card.querySelector<HTMLElement>("span.absolute");
  if (badge) badge.textContent = product.subCategory;
  const brand = name?.previousElementSibling;
  if (brand instanceof HTMLElement) {
    brand.textContent = product.brand;
  }
  const details = name?.nextElementSibling;
  if (details instanceof HTMLElement) {
    details.textContent = `${product.gender} · ${product.subCategory}`;
  }
}

function populateFashionProducts(root: HTMLElement) {
  const findSection = (title: string) =>
    Array.from(root.querySelectorAll("h3")).find(
      (heading) => heading.textContent?.trim() === title,
    )?.closest("section");

  const flashSection = findSection("Flash Deals");
  const flashCards = flashSection?.querySelectorAll<HTMLElement>(
    ".overflow-x-auto > div",
  );
  flashCards?.forEach((card, index) => {
    const product = fashionProducts.flashDeals[index];
    if (product) updateProductCard(card, product, true);
  });

  const trendingSection = findSection("Trending Picks");
  const trendingCards = trendingSection?.querySelectorAll<HTMLElement>(
    ".grid.grid-cols-2 > div",
  );
  trendingCards?.forEach((card, index) => {
    const product = fashionProducts.trending[index];
    if (product) updateProductCard(card, product, false);
  });
}

function updateCartBadges(root: HTMLElement, cart: FashionCart) {
  const count = getFashionCartCount(cart);
  const cartLinks = root.querySelectorAll<HTMLAnchorElement>(
    'a[data-path="shopping-cart"], a[data-path="cart"], a[aria-label*="Shopping Cart"]',
  );
  cartLinks.forEach((link) => {
    const badge = Array.from(
      link.querySelectorAll<HTMLElement>("span.absolute"),
    ).find((element) => /^\d+$/.test(element.textContent?.trim() ?? ""));
    if (badge) {
      badge.textContent = String(count);
      setElementVisible(badge, count > 0);
    }
    link.setAttribute(
      "aria-label",
      `Shopping Cart with ${count} ${count === 1 ? "item" : "items"}`,
    );
  });
}

function updateCartSummary(root: HTMLElement, cart: FashionCart) {
  const items = getFashionCartProducts(cart);
  const itemCount = getFashionCartCount(cart);
  const subtotal = items.reduce(
    (total, { product, quantity }) =>
      total + product.demoPriceInr * quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.05);
  const freeShippingThreshold = Math.round(100 * shopLocale.usdToInrRate);
  const shipping = itemCount > 0 && subtotal < freeShippingThreshold ? 199 : 0;
  const total = subtotal + tax + shipping;
  const formattedSubtotal = formatInr(subtotal);

  const itemsHeading = Array.from(root.querySelectorAll("h2")).find(
    (heading) => heading.textContent?.trim() === "Items in Cart",
  );
  const itemBadge = itemsHeading?.parentElement?.querySelector("span");
  if (itemBadge) itemBadge.textContent = String(itemCount);

  const summaryHeading = Array.from(root.querySelectorAll("h3")).find(
    (heading) => heading.textContent?.trim() === "Order Summary",
  );
  const summary = summaryHeading?.parentElement;
  const subtotalLabel = Array.from(
    summary?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((element) => element.textContent?.trim().startsWith("Subtotal ("));
  if (subtotalLabel) {
    subtotalLabel.textContent = `Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`;
    const value = subtotalLabel.nextElementSibling;
    if (value instanceof HTMLElement) value.textContent = formattedSubtotal;
  }

  const promoLabel = Array.from(
    summary?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((element) => element.textContent?.trim().startsWith("Voice Promo"));
  const promoRow = promoLabel?.closest<HTMLElement>("div.flex.justify-between");
  if (promoRow) setElementVisible(promoRow, false);

  const taxLabel = Array.from(
    summary?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((element) => element.textContent?.trim() === "Estimated Tax & GST");
  const taxValue = taxLabel?.nextElementSibling;
  if (taxValue instanceof HTMLElement) taxValue.textContent = formatInr(tax);

  const shippingLabel = Array.from(
    summary?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((element) => element.textContent?.trim() === "Shipping Fee");
  const shippingValue = shippingLabel?.closest("div.flex.justify-between")
    ?.lastElementChild;
  if (shippingValue instanceof HTMLElement) {
    shippingValue.textContent = shipping === 0 ? "FREE" : formatInr(shipping);
  }

  const totalLabel = Array.from(
    summary?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((element) => element.textContent?.trim() === "Total Amount");
  const totalValue =
    totalLabel?.parentElement?.nextElementSibling?.querySelector("span");
  if (totalValue) totalValue.textContent = formatInr(total);

  const stickyTotal = root
    .querySelector<HTMLButtonElement>('button[aria-label="Toggle price details view"]')
    ?.parentElement?.querySelectorAll("span")[1];
  if (stickyTotal) stickyTotal.textContent = formatInr(total);

  const checkoutButton = Array.from(
    root.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) =>
    button.textContent?.trim().startsWith("Proceed to Checkout"),
  );
  if (checkoutButton) {
    const label = checkoutButton.querySelector("span");
    if (label) {
      label.textContent =
        itemCount === 0
          ? "Your cart is empty"
          : `Proceed to Checkout (${itemCount} ${itemCount === 1 ? "Item" : "Items"})`;
    }
    checkoutButton.disabled = itemCount === 0;
    checkoutButton.setAttribute("aria-disabled", String(itemCount === 0));
  }

  const progressSection = Array.from(root.querySelectorAll("section")).find(
    (section) => section.textContent?.includes("unlock FREE Express Shipping"),
  );
  if (progressSection) {
    const remaining = Math.max(0, freeShippingThreshold - subtotal);
    const message = progressSection.querySelector("p");
    if (message) {
      message.textContent =
        remaining > 0
          ? `Add ${formatInr(remaining)} more to unlock FREE Express Shipping`
          : "You unlocked FREE Express Shipping!";
    }
    const status = progressSection.querySelector(
      "span.bg-secondary-fixed\\/50",
    );
    if (status) {
      status.textContent =
        remaining > 0 ? "Almost there!" : "Free shipping unlocked";
    }
    const labels = Array.from(
      progressSection.querySelectorAll<HTMLElement>("span"),
    );
    const spentLabel = labels.find((element) =>
      element.textContent?.trim().endsWith("spent"),
    );
    if (spentLabel) spentLabel.textContent = `${formattedSubtotal} spent`;
    const goalLabel = labels.find((element) =>
      element.textContent?.trim().startsWith("Goal:"),
    );
    if (goalLabel) goalLabel.textContent = `Goal: ${formatInr(freeShippingThreshold)}`;
    const progressBar = progressSection.querySelector<HTMLElement>(
      ".transition-all.duration-500",
    );
    if (progressBar) {
      progressBar.style.width = `${Math.min(
        100,
        (subtotal / freeShippingThreshold) * 100,
      )}%`;
    }
  }

  const promoCode = Array.from(root.querySelectorAll<HTMLElement>("span")).find(
    (element) => element.textContent?.trim() === "SPHEREVOICE",
  );
  const activePromo = promoCode?.parentElement?.parentElement?.parentElement;
  if (activePromo instanceof HTMLElement) setElementVisible(activePromo, false);
  const removeCoupon = root.querySelector<HTMLElement>(
    'button[aria-label="Remove coupon code"]',
  );
  if (removeCoupon) setElementVisible(removeCoupon, false);
}

function renderCartItems(
  root: HTMLElement,
  cart: FashionCart,
  template: HTMLElement,
) {
  const container = root.querySelector<HTMLElement>("#cart-item-container");
  if (!container) return;
  const items = getFashionCartProducts(cart);

  if (items.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className =
      "rounded-xl bg-surface-container-low p-space-lg text-center";
    const message = document.createElement("p");
    message.className = "font-body-md text-body-md text-on-surface-variant";
    message.textContent = "Your cart is empty. Add an available product to begin.";
    const browseLink = document.createElement("a");
    browseLink.className =
      "inline-block mt-space-sm font-label-md text-label-md font-semibold text-primary";
    browseLink.href = "/customer/home-marketplace";
    browseLink.textContent = "Continue shopping";
    emptyState.append(message, browseLink);
    container.replaceChildren(emptyState);
    return;
  }

  const cards = items.map(({ product, quantity }) => {
    const card = template.cloneNode(true);
    if (!(card instanceof HTMLElement)) return null;
    card.dataset.productId = product.id;

    const image = card.querySelector<HTMLImageElement>("img");
    if (image) {
      image.src = product.image;
      image.alt = product.name;
      image.dataset.alt = product.name;
    }

    const name = card.querySelector<HTMLElement>("h3");
    if (name) name.textContent = product.name;
    const details =
      name?.parentElement?.parentElement?.querySelector<HTMLElement>(
        "div.flex.items-center.gap-2",
      );
    const category = details?.querySelector<HTMLElement>("span");
    if (category) category.textContent = `${product.gender} · ${product.subCategory}`;

    const priceRow =
      name?.parentElement?.parentElement?.querySelector<HTMLElement>(
        "div.flex.items-baseline",
      );
    const prices = priceRow?.querySelectorAll<HTMLElement>("span");
    if (prices?.[0]) prices[0].textContent = formatInr(product.demoPriceInr);
    if (prices?.[1]) {
      if (product.demoOriginalPriceInr) {
        prices[1].textContent = formatInr(product.demoOriginalPriceInr);
        prices[1].hidden = false;
      } else {
        prices[1].hidden = true;
      }
    }

    const saleBadge = card.querySelector<HTMLElement>("span.absolute");
    if (saleBadge) {
      if (product.demoOriginalPriceInr) {
        const discount = Math.round(
          (1 - product.demoPriceInr / product.demoOriginalPriceInr) * 100,
        );
        saleBadge.textContent = `-${discount}%`;
      } else {
        saleBadge.hidden = true;
      }
    }

    const increaseButton = card.querySelector<HTMLButtonElement>(
      'button[aria-label="Increase quantity"]',
    );
    const decreaseButton = card.querySelector<HTMLButtonElement>(
      'button[aria-label="Decrease quantity"]',
    );
    const removeButton = card.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove item"]',
    );
    if (increaseButton) increaseButton.dataset.cartAction = "increase";
    if (decreaseButton) decreaseButton.dataset.cartAction = "decrease";
    if (removeButton) removeButton.dataset.cartAction = "remove";
    const quantityLabel = increaseButton?.previousElementSibling;
    if (quantityLabel) quantityLabel.textContent = String(quantity);
    return card;
  });

  container.replaceChildren(...cards.filter((card): card is HTMLElement => card !== null));
}

function setupCartPage(
  root: HTMLElement,
  initialCart: FashionCart,
): () => void {
  const container = root.querySelector<HTMLElement>("#cart-item-container");
  if (!container) return () => {};
  let template = cartItemTemplates.get(container);
  if (!template) {
    const sourceTemplate = container.querySelector<HTMLElement>("article");
    const clone = sourceTemplate?.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return () => {};
    template = clone;
    cartItemTemplates.set(container, template);
  }

  const render = (cart: FashionCart) => {
    updateCartSummary(root, cart);
    renderCartItems(root, cart, template);
  };
  render(initialCart);

  const handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(
      "button[data-cart-action]",
    );
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const productId = button.closest<HTMLElement>("article")?.dataset.productId;
    const action = button.dataset.cartAction;
    if (!productId || !action) return;

    const cart = readFashionCart();
    const quantity = cart[productId] ?? 0;
    if (action === "increase") cart[productId] = quantity + 1;
    if (action === "decrease" || action === "remove") {
      if (action === "remove" || quantity <= 1) {
        delete cart[productId];
      } else {
        cart[productId] = quantity - 1;
      }
    }
    if (!saveFashionCart(cart)) return;
    updateCartBadges(root, cart);
    render(cart);
  };
  container.addEventListener("click", handleClick, true);
  return () => container.removeEventListener("click", handleClick, true);
}

function setupHomeProductInteractions(root: HTMLElement): () => void {
  const searchInput = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search "]',
  );
  if (!searchInput) return () => {};
  searchInput.placeholder = "Search available products...";
  searchInput.setAttribute(
    "aria-label",
    "Search available products by name, brand, or category",
  );

  const flashSection = Array.from(root.querySelectorAll("h3")).find(
    (heading) => heading.textContent?.trim() === "Flash Deals",
  )?.closest("section");
  const trendingSection = Array.from(root.querySelectorAll("h3")).find(
    (heading) => heading.textContent?.trim() === "Trending Picks",
  )?.closest("section");
  const emptyState = document.createElement("p");
  emptyState.dataset.productSearchEmpty = "true";
  emptyState.className =
    "px-gutter py-space-lg text-center text-on-surface-variant";
  emptyState.textContent = "No available products match your search.";
  setElementVisible(emptyState, false);
  flashSection?.parentElement?.insertBefore(emptyState, flashSection);

  const cards = [
    ...(flashSection?.querySelectorAll<HTMLElement>(".overflow-x-auto > div") ?? []),
    ...(trendingSection?.querySelectorAll<HTMLElement>(".grid.grid-cols-2 > div") ?? []),
  ];
  const productById = new Map(
    availableFashionProducts.map((product) => [product.id, product]),
  );
  const filterProducts = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    let visibleFlashCount = 0;
    let visibleTrendingCount = 0;
    cards.forEach((card) => {
      const product = productById.get(
        card.querySelector<HTMLButtonElement>("button[data-product-id]")?.dataset
          .productId ?? "",
      );
      if (!product) {
        setElementVisible(card, false);
        return;
      }
      const matches =
        product.available &&
        `${product.name} ${product.brand} ${product.gender} ${product.masterCategory} ${product.subCategory}`
          .toLocaleLowerCase()
          .includes(query);
      setElementVisible(card, matches);
      if (matches) {
        visibleCount += 1;
        if (flashSection?.contains(card)) visibleFlashCount += 1;
        if (trendingSection?.contains(card)) visibleTrendingCount += 1;
      }
    });
    if (flashSection) setElementVisible(flashSection, visibleFlashCount > 0);
    if (trendingSection) {
      setElementVisible(trendingSection, visibleTrendingCount > 0);
    }
    setElementVisible(emptyState, visibleCount === 0);
  };

  searchInput.addEventListener("input", filterProducts);
  filterProducts();
  return () => {
    searchInput.removeEventListener("input", filterProducts);
    emptyState.remove();
    cards.forEach((card) => {
      setElementVisible(card, true);
    });
    if (flashSection) setElementVisible(flashSection, true);
    if (trendingSection) setElementVisible(trendingSection, true);
  };
}

function setupProductAddButtons(root: HTMLElement): () => void {
  const cleanups = Array.from(
    root.querySelectorAll<HTMLButtonElement>("button[data-product-id]"),
  ).map((button) => {
    const addToCart = () => {
      const product = availableFashionProducts.find(
        (item) => item.id === button.dataset.productId,
      );
      if (!product) return;
      const cart = readFashionCart();
      cart[product.id] = (cart[product.id] ?? 0) + 1;
      if (saveFashionCart(cart)) updateCartBadges(root, cart);
    };
    button.addEventListener("click", addToCart);
    return () => button.removeEventListener("click", addToCart);
  });
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

function localizeScreen(root: HTMLElement, screenSlug: string) {
  const locationReplacements: Array<[RegExp, string]> = [
    [/\bAlex Morgan\b/g, shopLocale.customerName],
    [/\bAlex M\./g, shopLocale.customerName],
    [/\bAlex\b/g, shopLocale.customerName],
    [/@alex\.morgan/gi, shopLocale.customerHandle],
    [/alex\.m@example\.com/gi, shopLocale.customerEmail],
    [
      /742 Evergreen Terrace, Apt 4B, Brooklyn, NY 11201/g,
      shopLocale.address,
    ],
    [
      /742 Evergreen Terrace, Apt 4B, Brooklyn, NY/g,
      shopLocale.address,
    ],
    [/\b11201 \(Brooklyn, NY\)/g, "560025 (Bengaluru, KA)"],
    [/\bBrooklyn Hub\b/g, "Bengaluru Hub"],
    [/\bBrooklyn, NY 11201\b/g, shopLocale.deliverTo],
    [/\bBrooklyn, NY\b/g, "Bengaluru, Karnataka"],
    [/\bBrooklyn\b/g, shopLocale.city],
    [/\bFORT GREENE\b/gi, "INDIRANAGAR"],
    [/\bHILLSIDE PARK\b/gi, "CUBBON PARK"],
    [/\bATLANTIC AVENUE\b/gi, "M.G. ROAD"],
    [/\bAtlantic Ave\b/g, "M.G. Road"],
    [/\bFlatbush Ave\b/g, "Residency Rd"],
    [/\bVanderbilt Ave\b/g, "Brigade Rd"],
    [/\b1\.8 miles\b/gi, "2.9 km"],
    [/\+1 \(555\) 234-8901/g, shopLocale.phone],
    [/🇺🇸/g, shopLocale.countryFlag],
    [/\+1\b/g, shopLocale.countryCode],
    [/English \(US\)/g, "English (India)"],
    [/USD \(\$\)/g, "INR (₹)"],
  ];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    let text = node.textContent ?? "";
    for (const [pattern, replacement] of locationReplacements) {
      text = text.replace(pattern, replacement);
    }
    text = text.replace(/(-?)\$\s?([\d,]+(?:\.\d{1,2})?)/g, (_, sign: string, value: string) => {
      return `${sign}${convertUsdToInr(value)}`;
    });
    if (node.textContent !== text) node.textContent = text;
    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const attribute of ["aria-label", "placeholder", "title", "alt", "value"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const localized = value
        .replace(/\+1 \(555\) 234-8901/g, shopLocale.phone)
        .replace(/🇺🇸/g, shopLocale.countryFlag)
        .replace(/Brooklyn, NY 11201/g, shopLocale.deliverTo)
        .replace(/Brooklyn, NY/g, "Bengaluru, Karnataka")
        .replace(/Brooklyn/g, shopLocale.city)
        .replace(/(-?)\$\s?([\d,]+(?:\.\d{1,2})?)/g, (_, sign: string, amount: string) => {
          return `${sign}${convertUsdToInr(amount)}`;
        });
      if (localized !== value) element.setAttribute(attribute, localized);
    }
  });

  if (screenSlug === "login") {
    const phoneInput = root.querySelector<HTMLInputElement>("#phone-input");
    if (phoneInput) phoneInput.placeholder = "98765 43210";
  }

  if (screenSlug === "profile-account") {
    const profileImage = root.querySelector<HTMLImageElement>(
      'img[data-alt*="Editorial portrait of Alex Morgan"]',
    );
    if (profileImage) {
      profileImage.src = "/images/unknown-person.svg";
      profileImage.alt = "Unknown person profile picture";
      profileImage.dataset.alt = "Unknown person profile picture";
    }
  }
}

function setupCheckoutInteractions(root: HTMLElement) {
  const codeInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[maxlength="1"]'),
  );
  const confirmButton = root.querySelector<HTMLButtonElement>("#confirmPayBtn");
  const biometricButton =
    root.querySelector<HTMLButtonElement>("#biometricBtn");
  const cancelButton = root.querySelector<HTMLButtonElement>("#cancelBtn");
  const codeStatus = Array.from(root.querySelectorAll("span")).find(
    (element) =>
      element.textContent?.trim() === "Code sent via Voice Prompt & SMS",
  );
  if (
    codeInputs.length !== 6 ||
    !confirmButton ||
    !biometricButton ||
    !cancelButton ||
    !codeStatus
  ) {
    return;
  }

  codeStatus.setAttribute("aria-live", "polite");
  let biometricAuthorized = false;
  let redirectPending = false;

  const clearCodeError = () => {
    codeStatus.textContent = "Code sent via Voice Prompt & SMS";
    codeStatus.classList.remove("text-error");
    codeInputs.forEach((input) => {
      input.classList.remove("ring-2", "ring-error");
      input.removeAttribute("aria-invalid");
    });
  };

  const distributeDigits = (startIndex: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      codeInputs[startIndex].value = "";
      return;
    }
    digits
      .slice(0, codeInputs.length - startIndex)
      .split("")
      .forEach((digit, offset) => {
        codeInputs[startIndex + offset].value = digit;
      });
    codeInputs[Math.min(startIndex + digits.length, codeInputs.length - 1)].focus();
    clearCodeError();
  };

  codeInputs.forEach((input, index) => {
    input.inputMode = "numeric";
    input.setAttribute("aria-label", `Verification code digit ${index + 1}`);
    input.autocomplete = index === 0 ? "one-time-code" : "off";

    input.addEventListener("input", () => {
      const value = input.value;
      distributeDigits(index, value);
      if (value && index < codeInputs.length - 1) {
        codeInputs[Math.min(index + Math.max(value.length, 1), codeInputs.length - 1)].focus();
      }
    });
    input.addEventListener("paste", (event) => {
      event.preventDefault();
      distributeDigits(
        0,
        event.clipboardData?.getData("text") ?? "",
      );
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        codeInputs[index - 1].focus();
      } else if (event.key === "ArrowRight" && index < codeInputs.length - 1) {
        event.preventDefault();
        codeInputs[index + 1].focus();
      } else if (
        event.key === "Backspace" &&
        !input.value &&
        index > 0
      ) {
        codeInputs[index - 1].focus();
      }
    });
  });

  biometricButton.addEventListener(
    "click",
    () => {
      biometricAuthorized = true;
    },
    true,
  );

  confirmButton.addEventListener(
    "click",
    (event) => {
      if (biometricAuthorized) {
        biometricAuthorized = false;
      } else if (codeInputs.some((input) => !/^\d$/.test(input.value))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        codeStatus.textContent = "Enter all 6 digits to confirm your order.";
        codeStatus.classList.add("text-error");
        const firstEmptyIndex = codeInputs.findIndex(
          (input) => !/^\d$/.test(input.value),
        );
        codeInputs.forEach((input) => {
          const invalid = !/^\d$/.test(input.value);
          input.setAttribute("aria-invalid", String(invalid));
          input.classList.toggle("ring-2", invalid);
          input.classList.toggle("ring-error", invalid);
        });
        codeInputs[firstEmptyIndex]?.focus();
        return;
      }

      if (!redirectPending) {
        redirectPending = true;
        window.setTimeout(
          () => window.location.assign("/customer/order-confirmed"),
          1600,
        );
      }
    },
    true,
  );

  cancelButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign("/customer/my-cart");
    },
    true,
  );
}

function setupIndianPhoneInput(root: HTMLElement) {
  const phoneInput = root.querySelector<HTMLInputElement>("#phone-input");
  phoneInput?.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    phoneInput.value =
      digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
  });
}

function setupTrackingInteractions(root: HTMLElement) {
  const chatInput = root.querySelector<HTMLInputElement>("#chatInput");
  const sendButton = root.querySelector<HTMLButtonElement>(
    'button[onclick="sendUserMsg()"]',
  );
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      sendButton?.click();
    }
  });

  const courierMarker = root.querySelector<HTMLElement>("#courierMarker");
  const recenterButton =
    root.querySelector<HTMLButtonElement>('[aria-label="Recenter map"]');
  recenterButton?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      courierMarker?.classList.add("scale-110", "ring-4", "ring-primary/30");
      window.setTimeout(
        () =>
          courierMarker?.classList.remove(
            "scale-110",
            "ring-4",
            "ring-primary/30",
          ),
        900,
      );
    },
    true,
  );

  const compassButton =
    root.querySelector<HTMLButtonElement>('[aria-label="Compass"]');
  compassButton?.setAttribute("aria-pressed", "true");
  compassButton?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const compass = compassButton.querySelector("span");
      const isNorthUp = compassButton.getAttribute("aria-pressed") !== "true";
      compassButton.setAttribute("aria-pressed", String(isNorthUp));
      compass?.classList.toggle("rotate-180", !isNorthUp);
    },
    true,
  );

}

function markAssistantTriggers(root: HTMLElement): () => void {
  const triggers = new Set<HTMLElement>();
  const selectors = [
    'a[data-path="voice-assistant"]',
    "#voiceBtn",
    'button[aria-label="Activate voice tracking"]',
    'button[onclick*="triggerVoiceAssistant"]',
    "#tap-to-talk-btn",
    "#voice-core-orb",
  ];
  selectors.forEach((selector) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      triggers.add(element);
    });
  });

  const prompt = Array.from(root.querySelectorAll("p")).find((element) =>
    element.textContent?.includes("Where is my order right now?"),
  );
  const promptButton = prompt?.closest<HTMLElement>(".cursor-pointer")
    ?.querySelector<HTMLElement>("button");
  if (promptButton) triggers.add(promptButton);

  const marked = new Set<HTMLElement>();
  triggers.forEach((trigger) => {
    if (!trigger.hasAttribute("data-jarvis-mic")) {
      trigger.setAttribute("data-jarvis-mic", "");
      marked.add(trigger);
    }
  });

  return () => {
    marked.forEach((trigger) => trigger.removeAttribute("data-jarvis-mic"));
  };
}

export function ScreenRenderer({
  bodyClass,
  markup,
  screenSlug,
  styles,
  scripts,
}: ScreenRendererProps) {
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = screenRef.current;
    if (!root) return;

    const interactionCleanups: Array<() => void> = [];
    if (screenSlug === "home-marketplace") {
      populateFashionProducts(root);
    }
    syncOrderDetails(root, screenSlug);
    localizeScreen(root, screenSlug);

    root.querySelectorAll<HTMLAnchorElement>("a[data-path]").forEach((link) => {
      const path = link.dataset.path;
      if (path && customerLinks[path]) link.href = customerLinks[path];
    });

    root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
      const label = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const destination = textLinks.find(([pattern]) => pattern.test(label))?.[1];
      if (destination) link.href = destination;
    });

    const scriptElements: HTMLScriptElement[] = [];
    const exportedFunctionNames = new Set<string>();
    const inlineHandlerFunctions = new Set(
      [...markup.matchAll(/\bon\w+\s*=\s*(["'])(.*?)\1/gi)]
        .flatMap((handler) =>
          [...handler[2].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(
            (match) => match[1],
          ),
        ),
    );
    for (const scriptText of scripts) {
      const personalizedScript = scriptText
        .replace(/\bAlex Morgan\b/g, shopLocale.customerName)
        .replace(/\bAlex M\./g, shopLocale.customerName)
        .replace(/\bAlex\b/g, shopLocale.customerName)
        .replace(/\bAtlantic Ave\b/g, "M.G. Road");
      const declaredFunctions = [
        ...scriptText.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g),
      ]
        .map((match) => match[1])
        .filter((name) => inlineHandlerFunctions.has(name));
      declaredFunctions.forEach((name) => exportedFunctionNames.add(name));
      const exports = declaredFunctions
        .map((name) => `window[${JSON.stringify(name)}] = ${name};`)
        .join("\n");
      const script = document.createElement("script");
      script.textContent = `(() => {\n${personalizedScript}\n${exports}\n})();`;
      root.appendChild(script);
      scriptElements.push(script);
    }

    const cart = readFashionCart();
    updateCartBadges(root, cart);
    interactionCleanups.push(markAssistantTriggers(root));
    if (screenSlug === "home-marketplace") {
      interactionCleanups.push(setupHomeProductInteractions(root));
      interactionCleanups.push(setupProductAddButtons(root));
    }
    if (screenSlug === "my-cart") {
      interactionCleanups.push(setupCartPage(root, cart));
    }
    if (screenSlug === "login") setupIndianPhoneInput(root);
    if (screenSlug === "checkout-voice-confirmation") {
      setupCheckoutInteractions(root);
    }
    if (screenSlug === "live-order-tracking") {
      setupTrackingInteractions(root);
    }

    return () => {
      interactionCleanups.forEach((cleanup) => cleanup());
      scriptElements.forEach((script) => script.remove());
      for (const name of exportedFunctionNames) {
        Reflect.deleteProperty(window, name);
      }
    };
  }, [markup, screenSlug, scripts]);

  return (
    <div className="customer-background">
      <div
        ref={screenRef}
        className={`screen-shell ${bodyClass}`}
        dangerouslySetInnerHTML={{ __html: `${styles}${markup}` }}
      />
    </div>
  );
}
