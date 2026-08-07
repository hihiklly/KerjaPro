export const productConfig = {
  currency: "MYR",
  currencySymbol: "RM",
  locale: "en-MY",
  timezone: "Asia/Kuala_Lumpur",
  welcomeAiCredits: 3,
  creditBundles: [
    { code: "small", credits: 10, priceMinor: 1200 },
    { code: "medium", credits: 30, priceMinor: 3000, highlighted: true },
    { code: "value", credits: 80, priceMinor: 6800 },
  ],
  plans: [
    { code: "free", name: "Free Forever", monthlyPriceMinor: 0, annualPriceMinor: 0, monthlyCredits: 0 },
    { code: "standard", name: "Standard", monthlyPriceMinor: 2900, annualPriceMinor: 29000, monthlyCredits: 40, highlighted: true },
    { code: "pro", name: "Pro", monthlyPriceMinor: 5900, annualPriceMinor: 59000, monthlyCredits: 120 },
  ],
} as const;

export const formatMoney = (minor: number) => `${productConfig.currencySymbol}${(minor / 100).toFixed(0)}`;
