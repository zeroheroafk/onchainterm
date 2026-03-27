import { CoinMarketData } from "@/types/market";
import { PriceRow } from "./PriceRow";

interface PriceTableProps {
  data: CoinMarketData[];
}

export function PriceTable({ data }: PriceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b border-terminal-green/30 text-terminal-green-dim uppercase text-xs tracking-wider">
            <th className="py-2 px-2 text-right w-8">#</th>
            <th className="py-2 px-2 text-left">Asset</th>
            <th className="py-2 px-2 text-right">Price</th>
            <th className="py-2 px-2 text-right">1H</th>
            <th className="py-2 px-2 text-right">24H</th>
            <th className="py-2 px-2 text-right hidden lg:table-cell">7D</th>
            <th className="py-2 px-2 text-right hidden sm:table-cell">
              Mkt Cap
            </th>
            <th className="py-2 px-2 text-right hidden md:table-cell">
              Volume
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((coin, index) => (
            <PriceRow key={coin.id} coin={coin} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
