import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, ShieldAlert, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to TradeSense Simulator",
      icon: ShieldAlert,
      iconColor: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      content: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            TradeSense is a full-featured paper trading terminal where you can practice trading real financial instruments across <strong>NSE Equities, Forex, Commodities, and Crypto</strong>.
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px]">
            &bull; All capital is 100% simulated dummy funds.<br />
            &bull; No real money or bank accounts are linked.
          </div>
        </div>
      )
    },
    {
      title: "Isolated Multi-Market Portfolios",
      icon: TrendingUp,
      iconColor: "text-bull bg-bull/15 border-bull/30",
      content: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Every market segment has its own independent virtual balance and margin requirements:
          </p>
          <div className="p-3 rounded-xl bg-dark-900 border border-dark-750 font-mono text-[11px] space-y-1">
            <div>&bull; <strong className="text-white">NSE</strong>: ₹10,00,000 Starting Virtual Capital</div>
            <div>&bull; <strong className="text-white">Forex</strong>: $200,000 Starting Capital (up to 20x leverage)</div>
            <div>&bull; <strong className="text-white">Commodities</strong>: $200,000 Starting Capital (up to 10x leverage)</div>
            <div>&bull; <strong className="text-white">Crypto</strong>: $200,000 Starting Capital (up to 20x leverage)</div>
          </div>
          <p className="text-[11px] text-slate-400">
            If you run out of funds, click the <strong>Recharge Balance</strong> button to restore your dummy allocation anytime!
          </p>
        </div>
      )
    },
    {
      title: "Meet 'Doji' — Your AI Co-Pilot",
      icon: Sparkles,
      iconColor: "text-doji-light bg-doji/15 border-doji/30",
      content: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p>
            Whenever you load an instrument, click the pulsing <strong>"Ask Doji AI"</strong> button docked on the chart.
          </p>
          <p>
            Doji immediately scans the candlestick series and overlays:
          </p>
          <div className="p-3 rounded-xl bg-dark-900 border border-dark-750 font-mono text-[11px] space-y-1">
            <div>&bull; Suggested Entry point & Direction (Buy/Sell)</div>
            <div>&bull; Stop Loss & Take Profit dashed lines</div>
            <div>&bull; Support & Resistance shaded price bands</div>
            <div>&bull; Plain-English technical rationale & Confidence score</div>
          </div>
          <p className="text-[11px] text-doji-light">
            You can click <em>"Adopt Doji's Setup"</em> to automatically prefill the order form with Doji's calculated parameters!
          </p>
        </div>
      )
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-600 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 font-sans">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${current.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">{current.title}</h3>
            <p className="text-[11px] text-slate-400 font-mono">Step {step + 1} of {steps.length}</p>
          </div>
        </div>

        <div className="mb-6 min-h-[140px]">
          {current.content}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dark-750">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === step ? 'bg-doji w-4' : 'bg-dark-700'
                }`}
              />
            ))}
          </div>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-doji hover:bg-doji-dark shadow-md transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold text-dark-950 bg-emerald-400 hover:bg-emerald-300 shadow-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Start Trading</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
