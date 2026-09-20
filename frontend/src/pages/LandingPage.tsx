import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Cpu, 
  Crosshair, 
  Target, 
  Layers, 
  ArrowRight, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Zap,
  Play
} from 'lucide-react';
import { CandleBackground } from '../components/CandleBackground';
import { NewsItem, Quote } from '../services/api';

interface LandingPageProps {
  onStartTrading: () => void;
  onDemoLogin: () => void;
  news: NewsItem[];
  quotes: Record<string, Quote>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartTrading,
  onDemoLogin,
  news,
  quotes
}) => {
  // Doji typing simulation messages
  const dojiScenarios = [
    "Scanning RELIANCE.NS on 15m... Bullish Engulfing pattern detected. RSI oversold at 31.2. Strong support bounce at ₹2,940. Suggested R:R 1:2.4. Target: ₹3,050.",
    "Analyzing EUR/USD on 1h... Moving average crossover confirmed. 20-EMA breaking above 50-EMA. Macro momentum turning positive. Long entry recommended.",
    "Evaluating BTC/USD on 5m... Volatility squeeze expanding out of Bollinger lower band. Liquidity sweep complete. Model confidence: 84% Bullish.",
    "Scanning GOLD Futures on 15m... Testing key resistance at $2,685. Negative MACD divergence printing. Suggested defensive Stop Loss at $2,692."
  ];

  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let charIndex = 0;
    const fullText = dojiScenarios[currentScenarioIndex];
    setTypedText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      if (charIndex <= fullText.length) {
        setTypedText(fullText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setTimeout(() => {
          setCurrentScenarioIndex((prev) => (prev + 1) % dojiScenarios.length);
        }, 4000);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [currentScenarioIndex]);

  return (
    <div className="relative min-h-screen bg-dark-900 text-slate-100 overflow-hidden">
      {/* Background animated candlesticks */}
      <CandleBackground />

      {/* Real-time Scrolling Ticker Marquee */}
      <div className="relative z-10 w-full bg-dark-950/90 border-b border-dark-800/80 py-2 overflow-hidden flex items-center">
        <div className="flex items-center gap-1 px-3 bg-dark-950 shrink-0 z-10 text-[10px] uppercase font-bold tracking-wider text-doji border-r border-dark-800">
          <Zap className="w-3 h-3 fill-doji" />
          <span>Live Ticker</span>
        </div>
        <div className="flex animate-marquee whitespace-nowrap gap-8 text-xs font-mono">
          {Object.values(quotes).length > 0 ? (
            Object.values(quotes).concat(Object.values(quotes)).map((q, idx) => (
              <div key={`${q.symbol}-${idx}`} className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{q.name}</span>
                <span className="text-white">
                  {q.currency}{q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className={`text-[11px] font-bold ${q.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {q.change >= 0 ? '+' : ''}{q.change_pct}%
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-8 text-slate-400">
              <span>NIFTY 50: ₹24,850.20 (+0.42%)</span>
              <span>RELIANCE: ₹2,980.50 (+1.15%)</span>
              <span>EUR/USD: $1.0854 (+0.08%)</span>
              <span>GOLD: $2,680.00 (+0.35%)</span>
              <span>BITCOIN: $67,450.00 (+2.10%)</span>
              <span>HDFC BANK: ₹1,640.25 (+0.65%)</span>
            </div>
          )}
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center flex flex-col items-center">
        
        {/* Fintech Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-800/80 border border-doji/30 text-doji-light text-xs font-medium mb-6 shadow-lg shadow-doji/10 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-doji" />
          <span>Next-Generation Multi-Market Paper Trading Platform</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Trade Smarter. <br />
          <span className="text-gradient-doji">Trade Sensibly.</span>
        </h1>

        {/* Hero Tagline / Platform Description */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Experience true multi-market paper trading across <strong className="text-white">NSE, Forex, Commodities, and Crypto</strong> with isolated institutional portfolios, zero financial risk, and an AI quantitative co-pilot named <strong className="text-doji-light">Doji</strong> overlaying on-demand technical analysis directly on your charts.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button
            onClick={onStartTrading}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-doji via-indigo-600 to-purple-700 hover:from-doji-dark hover:to-indigo-800 shadow-xl shadow-doji/25 hover:shadow-doji/40 hover:scale-102 transition-all text-sm"
          >
            <span>Launch Trading Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onDemoLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-medium text-slate-200 hover:text-white bg-dark-800/80 hover:bg-dark-750 border border-dark-600 shadow-lg hover:border-slate-500 transition-all text-sm"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Instant Demo Account (1-Click)</span>
          </button>
        </div>

        {/* Highlights Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl text-left">
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">NSE Indian Equities</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">₹10,00,000</div>
            <div className="text-[11px] text-bull flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Real NSE Tickers
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">Forex Currencies</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">$200,000</div>
            <div className="text-[11px] text-bull flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Up to 20x Leverage
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">Commodities Futures</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">$200,000</div>
            <div className="text-[11px] text-bull flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Gold, Silver, Crude
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">Crypto Assets</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">$200,000</div>
            <div className="text-[11px] text-bull flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> 24/7 Tick Streaming
            </div>
          </div>
        </div>

      </section>

      {/* INTRODUCING DOJI SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16 border-t border-dark-800">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-doji/10 border border-doji/30 text-doji-light text-xs font-mono uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3" />
            Artificial Intelligence Co-Pilot
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Meet <span className="text-gradient-doji">Doji</span> — Your AI Quantitative Analyst
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
            Doji scans hundreds of data points, combines multi-timeframe moving averages, momentum oscillators, and volume-weighted support/resistance clustering to overlay actionable, non-black-box trade setups right on your chart.
          </p>
        </div>

        {/* Interactive Doji Simulation Box */}
        <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto mb-16 relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-doji via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-doji/40">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-bull border-2 border-dark-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">Doji Neural Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-doji/20 text-doji-light border border-doji/30">
                    ONLINE &bull; 92.4% CONVERGENCE
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">Real-time Technical & Momentum Analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400 font-mono">Status:</span>
              <span className="text-xs font-mono text-bull flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bull animate-ping" />
                Active Evaluation
              </span>
            </div>
          </div>

          {/* Typing Effect Terminal View */}
          <div className="mt-6 bg-dark-950/80 rounded-xl p-4 sm:p-5 border border-dark-700/80 font-mono text-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2">doji_analysis_stream.log</span>
            </div>
            <div className="text-slate-200 min-h-[70px] leading-relaxed">
              <span className="text-doji-light font-bold">doji@tradesense:~$ </span>
              <span>{typedText}</span>
              {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-doji animate-pulse align-middle" />}
            </div>
          </div>

          {/* Mini Interactive Preview Features */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-dark-850/60 border border-dark-700">
              <div className="text-slate-400">Target Risk/Reward:</div>
              <div className="text-white font-bold text-sm mt-0.5 text-bull">1 : 2.4 (Favorable)</div>
            </div>
            <div className="p-3 rounded-lg bg-dark-850/60 border border-dark-700">
              <div className="text-slate-400">ATR Stop Loss Distance:</div>
              <div className="text-white font-bold text-sm mt-0.5 text-amber-400">1.5x ATR Buffer</div>
            </div>
            <div className="p-3 rounded-lg bg-dark-850/60 border border-dark-700">
              <div className="text-slate-400">Cluster S/R Zones:</div>
              <div className="text-white font-bold text-sm mt-0.5 text-indigo-400">Dual Pivot Ensembles</div>
            </div>
          </div>

        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="interactive-card glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-doji/10 border border-doji/30 flex items-center justify-center text-doji-light mb-4">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">On-Demand Chart Overlays</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Trigger Doji with one click. Entry flags, target exit zones, and dashed SL/TP price levels render seamlessly on the exact same TradingView chart.
            </p>
          </div>

          <div className="interactive-card glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-bull/10 border border-bull/30 flex items-center justify-center text-bull mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Dynamic S/R Zone Mapping</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              No guesswork. Algorithmic peak/trough clustering highlights institutional support and resistance price channels before you enter.
            </p>
          </div>

          <div className="interactive-card glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Plain-English Rationales</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Never trade a black box. Read Doji's human-readable explanation breaking down RSI levels, MACD shifts, and moving average momentum confluences.
            </p>
          </div>
        </div>

      </section>

      {/* LATEST MARKET NEWS SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16 border-t border-dark-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Latest Market News & Intelligence
            </h2>
            <p className="text-xs text-slate-400 mt-1">Live market developments curated across equities, currencies, and digital assets.</p>
          </div>
          <button 
            onClick={onStartTrading}
            className="flex items-center gap-1.5 text-xs font-semibold text-doji-light hover:text-white transition-colors"
          >
            <span>Trade on These Catalysts</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.slice(0, 6).map((item) => (
            <div key={item.id} className="interactive-card glass-panel rounded-xl overflow-hidden flex flex-col justify-between">
              {item.thumbnail && (
                <div className="h-40 w-full overflow-hidden relative">
                  <img 
                    src={item.thumbnail} 
                    alt={item.headline}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-2 left-3 text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900/90 text-slate-300 border border-dark-700">
                    {item.source}
                  </span>
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{item.timestamp}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                    {item.headline}
                  </h4>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                    {item.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-dark-700/60 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    {item.related_symbols.slice(0, 2).map((sym) => (
                      <span key={sym} className="px-1.5 py-0.5 rounded bg-dark-750 text-slate-300">
                        {sym}
                      </span>
                    ))}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-doji-light hover:text-white flex items-center gap-1"
                  >
                    <span>Read</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 w-full bg-dark-950 border-t border-dark-800 py-12 px-4 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-doji flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">TradeSense</span>
              <p className="text-[11px] text-slate-500 font-mono">Advanced AI Paper Trading Simulator</p>
            </div>
          </div>

          {/* Clear Non-negotiable Disclaimer */}
          <div className="max-w-xl text-center md:text-left text-[11px] text-slate-400 leading-relaxed bg-dark-900/80 p-3 rounded-xl border border-dark-800">
            <strong className="text-amber-400 block mb-0.5">Educational Simulator Disclaimer:</strong>
            TradeSense is a paper trading simulation platform built strictly for educational, analytical, and portfolio testing purposes. No real money or actual financial securities are utilized, deposited, or at risk at any point.
          </div>

          <div className="text-xs text-slate-500 font-mono text-center md:text-right">
            &copy; {new Date().getFullYear()} TradeSense. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};
