import { CoinMarketData } from "@/types/market";

export async function fetchMarketData(): Promise<CoinMarketData[]> {
  const res = await fetch("/api/prices");

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
