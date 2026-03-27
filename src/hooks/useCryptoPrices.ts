"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CoinMarketData } from "@/types/market";
import { fetchMarketData } from "@/lib/coingecko";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";

interface UseCryptoPricesReturn {
  data: CoinMarketData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useCryptoPrices(): UseCryptoPricesReturn {
  const [data, setData] = useState<CoinMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const marketData = await fetchMarketData();
      setData(marketData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData]);

  return { data, isLoading, error, lastUpdated, refresh: loadData };
}
