export const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "ripple",
  "binancecoin",
  "solana",
  "dogecoin",
  "cardano",
  "tron",
  "avalanche-2",
  "chainlink",
  "sui",
  "stellar",
  "shiba-inu",
  "hedera-hashgraph",
  "polkadot",
  "bitcoin-cash",
  "hyperliquid",
  "litecoin",
  "uniswap",
  "leo-token",
  "monero",
  "pepe",
  "near",
  "aptos",
  "aave",
  "internet-computer",
  "ethereum-classic",
  "render-token",
  "mantle",
  "crypto-com-chain",
  "vechain",
  "ondo-finance",
  "kaspa",
  "filecoin",
  "artificial-superintelligence-alliance",
  "arbitrum",
  "cosmos",
  "okb",
  "celestia",
  "bonk",
  "injective-protocol",
  "immutable-x",
  "the-graph",
] as const;

export const REFRESH_INTERVAL_MS = 120_000; // 2 min — CoinGecko for market cap/volume only, Binance WS handles live prices

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price >= 1 ? 2 : 4,
    maximumFractionDigits: price >= 1 ? 2 : 6,
  }).format(price);
}

export function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function formatPercentage(pct: number | null): string {
  if (pct === null || pct === undefined) return "N/A";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
