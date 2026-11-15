export const creditPacks = [
  { id: "starter", name: "Quick boost", credits: 50, priceInr: 29 },
  { id: "creator", name: "Creator pack", credits: 170, priceInr: 100 },
  { id: "studio", name: "Studio pack", credits: 1000, priceInr: 500 },
] as const;
export type CreditPackId = typeof creditPacks[number]["id"];
export function getCreditPack(id: string) { return creditPacks.find(pack => pack.id === id); }
