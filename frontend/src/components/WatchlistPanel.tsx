import React, { useState } from 'react';
import { SymbolInfo, Quote } from '../services/api';
import { Search, TrendingUp, TrendingDown, Star, Sparkles } from 'lucide-react';

interface WatchlistPanelProps {
  symbols: SymbolInfo[];
  quotes: Record<string, Quote>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  currency: string;
}

interface WatchlistRowProps {
  item: SymbolInfo;
  quote?: Quote;
  isSelected: boolean;
  onSelect: () => void;
  currency: string;
}

const WatchlistRow: React.FC<WatchlistRowProps> = ({
  item,
  quote,
  isSelected,
  onSelect,
  currency,
}) => {
  const prevPriceRef = React.useRef<number | undefined>(quote?.price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    if (quote?.price !== undefined) {
      if (prevPriceRef.current !== undefined && quote.price !== prevPriceRef.current) {
        setFlash(quote.price > prevPriceRef.current ? 'up' : 'down');
        const timer = setTimeout(() => setFlash(null), 700);
        prevPriceRef.current = quote.price;
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = quote.price;
    }
  }, [quote?.price]);

  const isGain = (quote?.change || 0) >= 0;

  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between text-xs font-mono border ${
        flash === 'up'
          ? 'bg-bull/20 border-bull/60 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
          : flash === 'down'
          ? 'bg-bear/20 border-bear/60 shadow-[0_0_12px_rgba(255,59,48,0.2)]'
          : isSelected
          ? 'bg-dark-750 border-doji/50 shadow-md'
          : 'bg-dark-900/60 border-dark-800 hover:bg-dark-750 hover:border-dark-700'
      }`}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
            {item.base || item.symbol}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-dark-800 text-slate-400 border border-dark-700">
            {item.type}
          </span>
          {quote && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" title="Live streaming tick active" />
          )}
        </div>
        <div className="text-[10px] text-slate-400 truncate max-w-[120px] font-sans mt-0.5">
          {item.name}
        </div>
      </div>

      {quote ? (
        <div className="text-right">
          <div className={`font-bold transition-colors duration-200 ${
            flash === 'up' ? 'text-bull font-extrabold' : flash === 'down' ? 'text-bear font-extrabold' : 'text-white'
          }`}>
            {currency}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </div>
          <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
            isGain ? 'text-bull' : 'text-bear'
          }`}>
            {isGain ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            <span>{isGain ? '+' : ''}{quote.change_pct}%</span>
          </div>
        </div>
      ) : (
        <div className="text-right text-slate-500 text-[10px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-ping inline-block" />
          <span>Connecting...</span>
        </div>
      )}
    </div>
  );
};

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  symbols,
  quotes,
  selectedSymbol,
  onSelectSymbol,
  currency
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSymbols = symbols.filter((s) => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden">
      
      {/* Header & Search */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">Market Watchlist</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{filteredSymbols.length} Instruments</span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search symbol, company, sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-750 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-doji font-mono"
          />
        </div>
      </div>

      {/* Symbols List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredSymbols.map((item) => (
          <WatchlistRow
            key={item.symbol}
            item={item}
            quote={quotes[item.symbol]}
            isSelected={selectedSymbol === item.symbol}
            onSelect={() => onSelectSymbol(item.symbol)}
            currency={currency}
          />
        ))}
      </div>

    </div>
  );
};
