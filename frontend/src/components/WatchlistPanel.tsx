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
        {filteredSymbols.map((item) => {
          const q = quotes[item.symbol];
          const isSelected = selectedSymbol === item.symbol;
          const isGain = (q?.change || 0) >= 0;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-mono border ${
                isSelected
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
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px] font-sans mt-0.5">
                  {item.name}
                </div>
              </div>

              {q ? (
                <div className="text-right">
                  <div className="font-bold text-white">
                    {currency}{q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>
                  <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                    isGain ? 'text-bull' : 'text-bear'
                  }`}>
                    {isGain ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    <span>{isGain ? '+' : ''}{q.change_pct}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-right text-slate-500 text-[10px]">
                  Connecting...
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
