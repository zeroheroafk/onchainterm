import { NextResponse } from "next/server";
import { COIN_IDS } from "@/lib/constants";

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";

const MOCK_DATA = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "", current_price: 87432.21, market_cap: 1732000000000, market_cap_rank: 1, total_volume: 28500000000, price_change_percentage_24h: 2.34, price_change_percentage_1h_in_currency: 0.12, price_change_percentage_7d_in_currency: 5.67, last_updated: new Date().toISOString() },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "", current_price: 3456.78, market_cap: 415000000000, market_cap_rank: 2, total_volume: 14200000000, price_change_percentage_24h: -1.23, price_change_percentage_1h_in_currency: -0.34, price_change_percentage_7d_in_currency: 3.21, last_updated: new Date().toISOString() },
  { id: "solana", symbol: "sol", name: "Solana", image: "", current_price: 187.45, market_cap: 86000000000, market_cap_rank: 3, total_volume: 3200000000, price_change_percentage_24h: 4.56, price_change_percentage_1h_in_currency: 1.23, price_change_percentage_7d_in_currency: 12.34, last_updated: new Date().toISOString() },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "", current_price: 612.30, market_cap: 91000000000, market_cap_rank: 4, total_volume: 1800000000, price_change_percentage_24h: 0.87, price_change_percentage_1h_in_currency: 0.05, price_change_percentage_7d_in_currency: 2.11, last_updated: new Date().toISOString() },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "", current_price: 2.34, market_cap: 134000000000, market_cap_rank: 5, total_volume: 5600000000, price_change_percentage_24h: -0.45, price_change_percentage_1h_in_currency: 0.08, price_change_percentage_7d_in_currency: -1.23, last_updated: new Date().toISOString() },
  { id: "cardano", symbol: "ada", name: "Cardano", image: "", current_price: 0.72, market_cap: 25400000000, market_cap_rank: 6, total_volume: 890000000, price_change_percentage_24h: 3.21, price_change_percentage_1h_in_currency: 0.45, price_change_percentage_7d_in_currency: 8.76, last_updated: new Date().toISOString() },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", image: "", current_price: 38.90, market_cap: 15800000000, market_cap_rank: 7, total_volume: 560000000, price_change_percentage_24h: 1.56, price_change_percentage_1h_in_currency: -0.12, price_change_percentage_7d_in_currency: 4.32, last_updated: new Date().toISOString() },
  { id: "polkadot", symbol: "dot", name: "Polkadot", image: "", current_price: 7.23, market_cap: 10200000000, market_cap_rank: 8, total_volume: 340000000, price_change_percentage_24h: -2.34, price_change_percentage_1h_in_currency: -0.67, price_change_percentage_7d_in_currency: -3.45, last_updated: new Date().toISOString() },
  { id: "chainlink", symbol: "link", name: "Chainlink", image: "", current_price: 18.45, market_cap: 11500000000, market_cap_rank: 9, total_volume: 780000000, price_change_percentage_24h: 5.67, price_change_percentage_1h_in_currency: 0.89, price_change_percentage_7d_in_currency: 15.23, last_updated: new Date().toISOString() },
  { id: "near", symbol: "near", name: "NEAR Protocol", image: "", current_price: 5.12, market_cap: 5800000000, market_cap_rank: 10, total_volume: 290000000, price_change_percentage_24h: -0.98, price_change_percentage_1h_in_currency: 0.23, price_change_percentage_7d_in_currency: 6.54, last_updated: new Date().toISOString() },
];

function addRandomVariation(data: typeof MOCK_DATA) {
  return data.map((coin) => ({
    ...coin,
    current_price: coin.current_price * (1 + (Math.random() - 0.5) * 0.002),
    price_change_percentage_24h: coin.price_change_percentage_24h + (Math.random() - 0.5) * 0.1,
    price_change_percentage_1h_in_currency: (coin.price_change_percentage_1h_in_currency ?? 0) + (Math.random() - 0.5) * 0.05,
    last_updated: new Date().toISOString(),
  }));
}

export async function GET() {
  try {
    const ids = COIN_IDS.join(",");
    const url = `${COINGECKO_URL}?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=${COIN_IDS.length}&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`CoinGecko: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(addRandomVariation(MOCK_DATA));
  }
}
