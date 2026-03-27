"use client";

import { useCountdown } from "@/hooks/useCountdown";

interface StatusBarProps {
  lastUpdated: Date | null;
  assetCount: number;
  isLoading: boolean;
  error: string | null;
}

export function StatusBar({
  lastUpdated,
  assetCount,
  isLoading,
  error,
}: StatusBarProps) {
  const secondsLeft = useCountdown(lastUpdated);

  const statusText = error
    ? "CONNECTION LOST"
    : isLoading
      ? "CONNECTING..."
      : "CONNECTED";

  const statusColor = error
    ? "text-terminal-red"
    : isLoading
      ? "text-terminal-amber"
      : "text-terminal-green";

  const statusDot = error ? "bg-terminal-red" : isLoading ? "bg-terminal-amber" : "bg-terminal-green";

  return (
    <div className="mt-4 pt-3 border-t border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-terminal-green-dim">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${statusDot} ${!error && !isLoading ? "animate-pulse-glow" : ""}`} />
        <span className={statusColor}>{statusText}</span>
      </div>

      <div className="flex items-center gap-4">
        {!isLoading && !error && (
          <span>NEXT UPDATE: {secondsLeft}s</span>
        )}
        <span>{assetCount} ASSETS TRACKED</span>
      </div>
    </div>
  );
}
