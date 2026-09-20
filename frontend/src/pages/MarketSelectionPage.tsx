import React from 'react';
import { 
  Building2, 
  Coins, 
  Flame, 
  Globe2, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Wallet,
  Sparkles
} from 'lucide-react';
import { PortfolioStats, Quote } from '../services/api';

interface MarketSelectionPageProps {
  portfolios: Record<string, PortfolioStats>;
  quotes: Record<string, Quote>;
  onSelectMarket: (market: 'nse' | 'forex' | 'commodities' | 'crypto') => void;
}

export const MarketSelectionPage: React.FC<MarketSelectionPageProps> = ({
  portfolios,
  quotes,
  onSelectMarket,
}) => {
  const marketCards = [
    {
      id: 'nse' as const,
      name: 'NSE Indian Equities',
      badge: 'National Stock Exchange',
      currency: '₹',
      defaultInstrument: 'RELIANCE.NS',
      repSymbolName: 'Reliance Industries (RELIANCE.NS)',
      indexRef: '^NSEI',
      indexName: 'NIFTY 50',
      description: 'Trade major Indian blue-chips, banking giants, and high-beta Nifty constituents with up to 5x intraday leverage.',
      icon: Building2,
      color: 'from-orange-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30 hover:border-amber-400',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      startBalance: '₹10,00,000',
      maxLeverage: '5x',
      instrumentCount: '12 Instruments'
    },
    {
      id: 'forex' as const,
      name: 'Forex Currency Pairs',
      badge: 'Global FX Liquidity',
      currency: '$',
      defaultInstrument: 'EURUSD=X',
      repSymbolName: 'EUR / USD Major Pair',
      indexRef: 'EURUSD=X',
      indexName: 'EUR / USD',
      description: 'Speculate on macro currency moves, interest rate differentials, and global central bank pivots with 20x leverage.',
      icon: Globe2,
      color: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      startBalance: '$200,000',
      maxLeverage: '20x',
      instrumentCount: '8 FX Pairs'
    },
    {
      id: 'commodities' as const,
      name: 'Commodities Futures',
      badge: 'Metals & Energy',
      currency: '$',
      defaultInstrument: 'GC=F',
      repSymbolName: 'Gold Futures (GC=F)',
      indexRef: 'CL=F',
      indexName: 'Crude Oil WTI',
      description: 'Hedge inflation and geopolitical cycles with physical and industrial commodities including Gold, Silver, and Crude Oil.',
      icon: Flame,
      color: 'from-yellow-500/20 via-amber-600/10 to-transparent',
      borderColor: 'border-yellow-500/30 hover:border-yellow-400',
      badgeColor: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
      startBalance: '$200,000',
      maxLeverage: '10x',
      instrumentCount: '6 Commodities'
    },
    {
      id: 'crypto' as const,
      name: 'Crypto Digital Assets',
      badge: '24/7 Digital Markets',
      currency: '$',
      defaultInstrument: 'BTC-USD',
      repSymbolName: 'Bitcoin / USD (BTC-USD)',
      indexRef: 'ETH-USD',
      indexName: 'Ethereum / USD',
      description: 'Trade decentralized blue chips, Layer 1 smart contract ecosystems, and digital store-of-value assets around the clock.',
      icon: Coins,
      color: 'from-purple-500/20 via-indigo-600/10 to-transparent',
      borderColor: 'border-purple-500/30 hover:border-purple-400',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      startBalance: '$200,000',
      maxLeverage: '20x',
      instrumentCount: '8 Cryptos'
    },
  ];

  return (
    <div className="min-h-[calc(100vh-65px)] bg-dark-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-dark-700 text-slate-300 text-xs font-mono uppercase mb-2">
            <Zap className="w-3.5 h-3.5 text-doji" />
            <span>Select Market Segment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Isolated Trading Workspaces
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Each market runs with its own dedicated virtual capital allocation and isolated margin rules. Choose a workspace below to begin trading with Doji AI assistance.
          </p>
        </div>

        {/* 4 Large Interactive Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {marketCards.map((m) => {
            const port = portfolios[m.id];
            const repQuote = quotes[m.defaultInstrument];
            const Icon = m.icon;
            const balanceVal = port ? port.balance : (m.id === 'nse' ? 1000000 : 200000);
            const equityVal = port ? port.equity : balanceVal;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMarket(m.id)}
                className={`group relative rounded-2xl bg-dark-800/90 border ${m.borderColor} p-6 sm:p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden flex flex-col justify-between`}
              >
                {/* Gradient background accent */}
                <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl ${m.color} rounded-full blur-3xl pointer-events-none -mr-20 -mt-20`} />

                <div>
                  {/* Top Bar: Icon, Name & Route Arrow */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-dark-750 border border-dark-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-1 group-hover:text-doji-light transition-colors">
                          {m.name}
                        </h3>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-dark-750 group-hover:bg-doji text-slate-300 group-hover:text-white flex items-center justify-center transition-all">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {m.description}
                  </p>

                  {/* Live Representative Instrument Quote */}
                  <div className="rounded-xl bg-dark-900/90 border border-dark-700/80 p-3.5 mb-6 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">Representative Instrument</div>
                      <div className="text-sm font-bold text-white">{m.repSymbolName}</div>
                    </div>
                    {repQuote ? (
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-white">
                          {repQuote.currency}{repQuote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </div>
                        <div className={`text-xs font-semibold ${repQuote.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                          {repQuote.change >= 0 ? '+' : ''}{repQuote.change_pct}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-white">Active Feed</div>
                        <div className="text-xs text-bull font-semibold">+0.65%</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Balance & Stats Bar */}
                <div className="pt-4 border-t border-dark-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-slate-400" />
                      <span>Available Dummy Capital</span>
                    </div>
                    <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                      {m.currency}{balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-400">Max Leverage:</span>
                    <span className="ml-1 text-xs font-bold text-doji-light font-mono px-2 py-0.5 rounded bg-dark-700">
                      {m.maxLeverage}
                    </span>
                    <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center justify-end gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Doji Ready
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
