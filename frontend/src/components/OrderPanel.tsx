import React, { useState, useEffect } from 'react';
import { Quote, PortfolioStats } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Calculator, 
  Info, 
  Check, 
  AlertCircle,
  Zap,
  Sparkles
} from 'lucide-react';

interface OrderPanelProps {
  symbol: string;
  market: string;
  quote?: Quote;
  portfolio?: PortfolioStats;
  currency: string;
  maxLeverage: number;
  onPlaceOrder: (orderData: {
    market: string;
    symbol: string;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    quantity: number;
    price?: number;
    requested_price?: number;
    leverage: number;
    stop_loss?: number;
    take_profit?: number;
  }) => Promise<any>;
  prefillSetup?: {
    entry: number;
    sl: number;
    tp: number;
    side: 'buy' | 'sell';
  } | null;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  symbol,
  market,
  quote,
  portfolio,
  currency,
  maxLeverage,
  onPlaceOrder,
  prefillSetup,
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize prices
  useEffect(() => {
    if (quote && limitPrice === 0) {
      setLimitPrice(quote.price);
    }
  }, [quote, limitPrice]);

  // Handle Doji setup adoption
  useEffect(() => {
    if (prefillSetup) {
      setSide(prefillSetup.side);
      setLimitPrice(prefillSetup.entry);
      setStopLoss(prefillSetup.sl.toString());
      setTakeProfit(prefillSetup.tp.toString());
      setSuccessMessage("Doji's setup applied to order form!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [prefillSetup]);

  // Current execution price reference
  const currentPrice = orderType === 'market' ? (quote?.price || 1) : (limitPrice || quote?.price || 1);
  
  // Mathematical calculations
  const notionalExposure = quantity * currentPrice;
  const marginRequired = notionalExposure / leverage;
  const freeMargin = portfolio ? portfolio.free_margin : 0;
  const hasEnoughMargin = freeMargin >= marginRequired;

  // Potential P&L estimates
  const slPrice = parseFloat(stopLoss);
  const tpPrice = parseFloat(takeProfit);

  let estLoss = 0;
  let estGain = 0;

  if (!isNaN(slPrice) && slPrice > 0) {
    estLoss = Math.abs((currentPrice - slPrice) * quantity);
  }
  if (!isNaN(tpPrice) && tpPrice > 0) {
    estGain = Math.abs((tpPrice - currentPrice) * quantity);
  }

  // Quick balance sizing
  const handleQuickPercent = (percent: number) => {
    if (!portfolio || currentPrice <= 0) return;
    const targetMargin = freeMargin * (percent / 100);
    const targetNotional = targetMargin * leverage;
    const calculatedQty = targetNotional / currentPrice;

    if (market === 'forex') {
      setQuantity(Math.max(0.01, parseFloat(calculatedQty.toFixed(2))));
    } else if (market === 'crypto') {
      setQuantity(Math.max(0.001, parseFloat(calculatedQty.toFixed(4))));
    } else {
      setQuantity(Math.max(1, Math.floor(calculatedQty)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0");
      return;
    }

    if (!hasEnoughMargin) {
      setErrorMessage(`Insufficient free margin. Required: ${currency}${marginRequired.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const requestedPrice = quote?.price || currentPrice;
      const res = await onPlaceOrder({
        market,
        symbol,
        side,
        order_type: orderType,
        quantity,
        price: orderType === 'limit' ? limitPrice : undefined,
        requested_price: requestedPrice,
        leverage,
        stop_loss: isNaN(slPrice) ? undefined : slPrice,
        take_profit: isNaN(tpPrice) ? undefined : tpPrice,
      });

      if (res && res.executed_price) {
        const slipText = res.slippage !== undefined && res.slippage !== null
          ? ` (Slippage: ${res.slippage >= 0 ? `+${res.slippage}` : `${res.slippage}`})`
          : '';
        setSuccessMessage(`${side.toUpperCase()} filled @ ${currency}${res.executed_price.toLocaleString()}${slipText}`);
      } else {
        setSuccessMessage(`${side.toUpperCase()} order successfully submitted!`);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-full font-sans">
      
      <div>
        {/* Order Type Tabs: Market / Limit */}
        <div className="flex items-center p-1 rounded-xl bg-dark-900 border border-dark-750 mb-4">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              orderType === 'market'
                ? 'bg-dark-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Market Order
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              orderType === 'limit'
                ? 'bg-dark-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Limit Order
          </button>
        </div>

        {/* Buy / Sell Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
              side === 'buy'
                ? 'bg-bull text-dark-950 shadow-lg shadow-bull/20 scale-102'
                : 'bg-dark-800 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Buy / Long</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
              side === 'sell'
                ? 'bg-bear text-white shadow-lg shadow-bear/20 scale-102'
                : 'bg-dark-800 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Sell / Short</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Limit Price Input if Limit Order */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">
                Limit Execution Price ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-doji"
                required
              />
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-mono text-[11px]">
                {market === 'forex' ? 'Lot Size / Contracts' : 'Quantity / Shares'}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Avail: {currency}{freeMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <input
              type="number"
              step={market === 'forex' ? '0.01' : market === 'crypto' ? '0.001' : '1'}
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-doji"
              required
            />
          </div>

          {/* Quick Balance Buttons (25% / 50% / 75% / 100%) */}
          <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="py-1 rounded bg-dark-900 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750 transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-mono text-[11px]">Leverage Multiplier</label>
              <span className="text-xs font-bold text-doji-light font-mono bg-dark-900 px-2 py-0.5 rounded border border-dark-700">
                {leverage}x
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={maxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full accent-doji cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>1x (Spot)</span>
              <span>{maxLeverage}x (Max)</span>
            </div>
          </div>

          {/* Stop Loss & Take Profit Fields */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">
                Stop Loss ({currency})
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-bear text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">
                Take Profit ({currency})
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-bull text-xs"
              />
            </div>
          </div>

          {/* Pre-Order Risk Breakdown Widget */}
          <div className="p-3 rounded-xl bg-dark-900 border border-dark-750 font-mono text-[11px] space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Notional Value:</span>
              <span className="text-white">{currency}{notionalExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Required Margin:</span>
              <span className={`font-bold ${hasEnoughMargin ? 'text-white' : 'text-bear'}`}>
                {currency}{marginRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {estLoss > 0 && (
              <div className="flex justify-between text-bear">
                <span>Est. Max Loss:</span>
                <span>-{currency}{estLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {estGain > 0 && (
              <div className="flex justify-between text-bull">
                <span>Est. Max Profit:</span>
                <span>+{currency}{estGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-bear/10 border border-bear/30 text-bear text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-lg bg-bull/10 border border-bull/30 text-bull text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !hasEnoughMargin}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
              side === 'buy'
                ? 'bg-bull hover:bg-bull-dark text-dark-950 shadow-bull/20'
                : 'bg-bear hover:bg-bear-dark text-white shadow-bear/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              "Executing..."
            ) : !hasEnoughMargin ? (
              "Insufficient Margin"
            ) : (
              `Confirm ${side.toUpperCase()} ${orderType.toUpperCase()}`
            )}
          </button>
        </form>
      </div>

      <div className="pt-3 border-t border-dark-750 text-[10px] text-slate-500 font-mono text-center">
        Simulated Execution &bull; Zero Financial Liability
      </div>

    </div>
  );
};
