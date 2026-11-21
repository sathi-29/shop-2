export const shopLocale = {
  customerName: "Sathish",
  customerHandle: "@sathish",
  customerEmail: "sathish@example.com",
  city: "Bengaluru",
  region: "Karnataka",
  postalCode: "560025",
  deliverTo: "Bengaluru, KA 560025",
  address:
    "42 Residency Road, Apt 4B, Ashok Nagar, Bengaluru, Karnataka 560025",
  phone: "+91 98765 43210",
  countryCode: "+91",
  countryFlag: "🇮🇳",
  usdToInrRate: 93.372746,
  rateAsOf: "2026-11-20",
} as const;

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function convertUsdToInr(amount: string) {
  const usdAmount = Number(amount.replaceAll(",", ""));
  return formatInr(usdAmount * shopLocale.usdToInrRate);
}
