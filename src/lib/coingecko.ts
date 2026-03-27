import { CoinMarketData } from "@/types/market";
import { COIN_IDS } from "./constants";

const BASE_URL = "https://api.coingecko.com/api/v3";

export async function fetchMarketData(): Promise<CoinMarketData[]> {
  const ids = COIN_IDS.join(",");
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
