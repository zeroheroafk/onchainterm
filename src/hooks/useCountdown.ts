"use client";

import { useState, useEffect } from "react";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";

export function useCountdown(lastUpdated: Date | null): number {
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_MS / 1000);

  useEffect(() => {
    if (!lastUpdated) return;

    const tick = () => {
      const elapsed = Date.now() - lastUpdated.getTime();
      const remaining = Math.max(
        0,
        Math.ceil((REFRESH_INTERVAL_MS - elapsed) / 1000)
      );
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return secondsLeft;
}
