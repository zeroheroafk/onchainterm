import { CoinMarketData } from "@/types/market";
import { formatPrice, formatPercentage } from "@/lib/constants";

interface PriceTickerProps {
  data: CoinMarketData[];
}

function TickerItem({ coin }: { coin: CoinMarketData }) {
  const pctColor =
    coin.price_change_percentage_24h >= 0
      ? "text-terminal-green"
      : "text-terminal-red";

  return (
    <span className="inline-flex items-center gap-1.5 px-4 whitespace-nowrap">
      <span className="text-terminal-green font-bold">
        {coin.symbol.toUpperCase()}
      </span>
      <span className="text-terminal-amber">
        {formatPrice(coin.current_price)}
      </span>
      <span className={`${pctColor} text-xs`}>
        {formatPercentage(coin.price_change_percentage_24h)}
      </span>
    </span>
  );
}

export function PriceTicker({ data }: PriceTickerProps) {
  if (data.length === 0) return null;

  return (
    <div className="overflow-hidden border-y border-terminal-border py-2 mb-4">
      <div className="flex animate-ticker" style={{ width: "200%" }}>
        <div className="flex shrink-0 text-sm font-mono">
          {data.map((coin) => (
            <TickerItem key={`a-${coin.id}`} coin={coin} />
          ))}
        </div>
        <div className="flex shrink-0 text-sm font-mono">
          {data.map((coin) => (
            <TickerItem key={`b-${coin.id}`} coin={coin} />
          ))}
        </div>
      </div>
    </div>
  );
}
