"use client";

import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { TerminalHeader } from "@/components/terminal/TerminalHeader";
import { PriceTicker } from "@/components/market/PriceTicker";
import { PriceTable } from "@/components/market/PriceTable";
import { StatusBar } from "@/components/market/StatusBar";
import { BlinkingCursor } from "@/components/terminal/BlinkingCursor";

export default function Home() {
  const { data, isLoading, error, lastUpdated } = useCryptoPrices();

  return (
    <TerminalShell>
      <TerminalHeader />

      {isLoading && data.length === 0 && (
        <div className="text-center py-16 font-mono">
          <p className="text-terminal-green glow-green text-lg">
            ESTABLISHING CONNECTION TO MARKET DATA FEED...
          </p>
          <p className="text-terminal-green-dim text-sm mt-2">
            INITIALIZING ONCHAINTERM v1.0
            <BlinkingCursor />
          </p>
        </div>
      )}

      {error && data.length === 0 && (
        <div className="text-center py-16 font-mono">
          <p className="text-terminal-red text-lg">
            ⚠ CONNECTION ERROR
          </p>
          <p className="text-terminal-red/70 text-sm mt-2">{error}</p>
          <p className="text-terminal-green-dim text-sm mt-4">
            RETRYING IN 45 SECONDS...
            <BlinkingCursor />
          </p>
        </div>
      )}

      {data.length > 0 && (
        <>
          <PriceTicker data={data} />
          <PriceTable data={data} />
        </>
      )}

      <StatusBar
        lastUpdated={lastUpdated}
        assetCount={data.length}
        isLoading={isLoading}
        error={error}
      />
    </TerminalShell>
  );
}
