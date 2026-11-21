export const demoOrder = {
  subtotalCents: 32_640,
  taxAndDeliveryCents: 2_740,
  totalCents: 35_380,
  deliveryShort: "Today by 2:45 PM",
  deliveryLong: "Today, 2:45 PM",
  items: [
    { shortName: "Headphones", trackingName: "Aura Studio ANC Headphones", priceCents: 17_900 },
    { shortName: "Keyboard", trackingName: "Aura Mechanical Keyboard", priceCents: 8_900 },
    { shortName: "Watch", trackingName: "Ceramic Smart Watch", priceCents: 5_840 },
  ],
} as const;

export function formatOrderAmount(amountInCents: number) {
  return `$${(amountInCents / 100).toFixed(2)}`;
}
