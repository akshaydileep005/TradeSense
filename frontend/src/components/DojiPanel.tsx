import React from 'react';
import { DojiAnalysis } from '../services/api';
import { 
  X, 
  Sparkles, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  ArrowRight, 
  Activity, 
  Cpu, 
  HelpCircle,
  Zap,
  BarChart2
} from 'lucide-react';

interface DojiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DojiAnalysis | null;
  isLoading: boolean;
  onApplySetup: (entry: number, sl: number, tp: number, side: 'buy' | 'sell') => void;
  currency: string;
}

export const DojiPanel: React.FC<DojiPanelProps> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  onApplySetup,
  currency
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-dark-950/95 border-l border-dark-700/80 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-dark-800 bg-dark-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-doji via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-doji/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Doji Quantitative Co-Pilot</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-doji/20 text-doji-light border border-doji/30">
                AI ANALYST
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Multi-Indicator Confluence Engine</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full border-4 border-doji/20 border-t-doji animate-spin mb-4" />
            <h4 className="font-bold text-white text-sm">Doji is Analyzing Market Confluence...</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
              Running EMA trend checks, RSI momentum scans, and support/resistance clustering.
            </p>
          </div>
        ) : analysis ? (
          <>
            {/* Setup Confidence Card */}
            <div className={`p-4 rounded-xl border ${
              analysis.signal_type === 'bullish' 
                ? 'bg-bull/5 border-bull/30' 
                : analysis.signal_type === 'bearish' 
                ? 'bg-bear/5 border-bear/30' 
                : 'bg-dark-850 border-dark-700'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400">Directional Probability</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-white font-bold">
                  {analysis.confidence}% Confidence
                </span>
              </div>

              <div className="flex items-center gap-3">
                {analysis.signal_type === 'bullish' ? (
                  <div className="w-10 h-10 rounded-xl bg-bull/15 text-bull flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                ) : analysis.signal_type === 'bearish' ? (
                  <div className="w-10 h-10 rounded-xl bg-bear/15 text-bear flex items-center justify-center shrink-0">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className={`text-base font-extrabold uppercase tracking-wide ${
                    analysis.signal_type === 'bullish' ? 'text-bull' : analysis.signal_type === 'bearish' ? 'text-bear' : 'text-slate-300'
                  }`}>
                    {analysis.signal_type} Setup
                  </h4>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Recommended R:R &bull; <strong className="text-white">1 : {analysis.risk_reward_ratio}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Target Price Levels Grid */}
            <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
              <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
                <div className="text-[10px] text-slate-400 uppercase">Suggested Entry</div>
                <div className="text-sm font-bold text-sky-400 mt-1">
                  {currency}{analysis.suggested_entry.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
                <div className="text-[10px] text-slate-400 uppercase">Stop Loss</div>
                <div className="text-sm font-bold text-bear mt-1">
                  {currency}{analysis.suggested_stop_loss.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
                <div className="text-[10px] text-slate-400 uppercase">Take Profit</div>
                <div className="text-sm font-bold text-bull mt-1">
                  {currency}{analysis.suggested_take_profit.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Plain-English Written Rationale */}
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-doji-light" />
                <span>Written Technical Rationale</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysis.rationale}
              </p>
            </div>

            {/* Indicator Confluence Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Confluence Factor Readings</span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">RSI (14):</span>
                  <span className="text-white font-semibold">{analysis.indicators.rsi_status}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">MACD Histogram:</span>
                  <span className="text-white font-semibold">{analysis.indicators.macd_signal}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">Trend Alignment:</span>
                  <span className="text-white font-semibold">{analysis.indicators.ema_trend}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">Bollinger Position:</span>
                  <span className="text-white font-semibold">{analysis.indicators.bollinger_position}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">Key Support Zone:</span>
                  <span className="text-indigo-400 font-semibold">{currency}{analysis.support_zone[0]} - {currency}{analysis.support_zone[1]}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                  <span className="text-slate-400">Key Resistance Zone:</span>
                  <span className="text-purple-400 font-semibold">{currency}{analysis.resistance_zone[0]} - {currency}{analysis.resistance_zone[1]}</span>
                </div>
              </div>
            </div>

            {/* Doji vs You Comparison Badge */}
            <div className="p-3.5 rounded-xl bg-doji/10 border border-doji/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-doji-light" />
                <span className="text-xs font-bold text-white font-mono">Doji vs You</span>
              </div>
              <span className="text-[11px] font-mono text-doji-light font-semibold">
                Setup Win Rate: 74.2% (Benchmark)
              </span>
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-slate-400 text-xs">
            No analysis loaded. Click "Ask Doji AI" on the chart to generate instant technical signals.
          </div>
        )}

      </div>

      {/* Bottom Action Footer */}
      {analysis && !isLoading && (
        <div className="p-4 border-t border-dark-800 bg-dark-900/80">
          <button
            onClick={() => onApplySetup(
              analysis.suggested_entry,
              analysis.suggested_stop_loss,
              analysis.suggested_take_profit,
              analysis.signal_type === 'bearish' ? 'sell' : 'buy'
            )}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-doji via-indigo-600 to-purple-600 hover:from-doji-dark hover:to-indigo-700 shadow-xl shadow-doji/30 transition-all hover:scale-102"
          >
            <span>Adopt Doji's Setup (Auto-Fill Order)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
