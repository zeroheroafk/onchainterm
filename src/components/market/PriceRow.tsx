import { CoinMarketData } from "@/types/market";
import {
  formatPrice,
  formatLargeNumber,
  formatPercentage,
} from "@/lib/constants";

interface PriceRowProps {
  coin: CoinMarketData;
  index: number;
}

function PercentCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-terminal-green-dim">N/A</span>;
  }
  const color = value >= 0 ? "text-terminal-green" : "text-terminal-red";
  return <span className={color}>{formatPercentage(value)}</span>;
}

export function PriceRow({ coin, index }: PriceRowProps) {
  return (
    <tr
      className="border-b border-terminal-border/30 hover:bg-terminal-green/5 transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="py-2 px-2 text-terminal-green-dim text-right w-8">
        {coin.market_cap_rank}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <span className="text-terminal-green font-bold">
            {coin.symbol.toUpperCase()}
          </span>
          <span className="text-terminal-green-dim text-xs hidden md:inline">
            {coin.name}
          </span>
        </div>
      </td>
      <td className="py-2 px-2 text-right font-mono text-terminal-amber glow-amber">
        {formatPrice(coin.current_price)}
      </td>
      <td className="py-2 px-2 text-right font-mono">
        <PercentCell value={coin.price_change_percentage_1h_in_currency} />
      </td>
      <td className="py-2 px-2 text-right font-mono">
        <PercentCell value={coin.price_change_percentage_24h} />
      </td>
      <td className="py-2 px-2 text-right font-mono hidden lg:table-cell">
        <PercentCell value={coin.price_change_percentage_7d_in_currency} />
      </td>
      <td className="py-2 px-2 text-right font-mono text-terminal-green-dim hidden sm:table-cell">
        {formatLargeNumber(coin.market_cap)}
      </td>
      <td className="py-2 px-2 text-right font-mono text-terminal-green-dim hidden md:table-cell">
        {formatLargeNumber(coin.total_volume)}
      </td>
    </tr>
  );
}
