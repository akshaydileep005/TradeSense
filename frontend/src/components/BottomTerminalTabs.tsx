import React, { useState, useEffect, useRef } from 'react';
import { Position, Order, TradeHistory, PortfolioStats, Quote } from '../services/api';
import { 
  Briefcase, 
  Clock, 
  BookOpen, 
  PieChart, 
  Download, 
  X, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface BottomTerminalTabsProps {
  positions: Position[];
  pendingOrders: Order[];
  tradeHistory: TradeHistory[];
  portfolio?: PortfolioStats;
  currency: string;
  market: string;
  quotes: Record<string, Quote>;
  onClosePosition: (positionId: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onRechargeBalance: () => Promise<void>;
  onExportCsv: () => void;
}

export const BottomTerminalTabs: React.FC<BottomTerminalTabsProps> = ({
  positions,
  pendingOrders,
  tradeHistory,
  portfolio,
  currency,
  market,
  quotes,
  onClosePosition,
  onCancelOrder,
  onRechargeBalance,
  onExportCsv
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history' | 'summary'>('positions');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);

  // Real-time price tick flash tracking
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down'>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down'> = {};
    let hasFlash = false;

    positions.forEach((pos) => {
      const q = quotes[pos.symbol];
      if (q) {
        const prev = prevPricesRef.current[pos.id];
        if (prev !== undefined && prev !== q.price) {
          newFlashes[pos.id] = q.price > prev ? 'up' : 'down';
          hasFlash = true;
        }
        prevPricesRef.current[pos.id] = q.price;
      } else if (prevPricesRef.current[pos.id] === undefined) {
        prevPricesRef.current[pos.id] = pos.current_price;
      }
    });

    if (hasFlash) {
      setFlashMap((prev) => ({ ...prev, ...newFlashes }));
      const timer = setTimeout(() => {
        setFlashMap((prev) => {
          const cleaned = { ...prev };
          Object.keys(newFlashes).forEach((k) => delete cleaned[k]);
          return cleaned;
        });
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [quotes, positions]);

  // Live Position calculations based on live WebSocket quote stream
  const livePositions = positions.map((pos) => {
    const liveQuote = quotes[pos.symbol];
    const markPrice = liveQuote ? liveQuote.price : pos.current_price;
    const isShort = pos.side.toLowerCase() === 'sell';
    const priceDiff = markPrice - pos.entry_price;
    const livePnl = isShort ? -priceDiff * pos.quantity : priceDiff * pos.quantity;
    const livePnlPct = pos.entry_price > 0 ? ((markPrice - pos.entry_price) / pos.entry_price) * 100 * pos.leverage * (isShort ? -1 : 1) : 0;
    
    // Dynamic margin & liquidation price calculation
    const notional = markPrice * pos.quantity;
    const liveMargin = notional / (pos.leverage || 1);
    const mmPct = market === 'forex' ? 0.03 : market === 'crypto' ? 0.05 : market === 'commodities' ? 0.04 : 0.05;
    const liveLiqPrice = !isShort
      ? Math.max(0, pos.entry_price * (1.0 - (1.0 / pos.leverage) + mmPct))
      : Math.max(0, pos.entry_price * (1.0 + (1.0 / pos.leverage) - mmPct));

    return {
      ...pos,
      markPrice,
      livePnl,
      livePnlPct,
      liveMargin,
      liveLiqPrice
    };
  });

  // Aggregated live portfolio metrics
  const totalLiveUnrealizedPnl = livePositions.reduce((sum, p) => sum + p.livePnl, 0);
  const totalLiveMarginUsed = livePositions.reduce((sum, p) => sum + p.margin_used, 0);
  const cashBalance = portfolio ? portfolio.balance : 0;
  const liveEquity = cashBalance + totalLiveUnrealizedPnl;
  const liveFreeMargin = Math.max(0, liveEquity - totalLiveMarginUsed);
  const totalNetPnl = (portfolio?.realized_pnl || 0) + totalLiveUnrealizedPnl;

  const handleClose = async (posId: string) => {
    setClosingId(posId);
    try {
      await onClosePosition(posId);
    } finally {
      setClosingId(null);
    }
  };

  const handleRechargeConfirm = async () => {
    setIsRecharging(true);
    try {
      await onRechargeBalance();
      setRechargeModalOpen(false);
    } finally {
      setIsRecharging(false);
    }
  };

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl overflow-hidden flex flex-col h-[340px] font-sans">
      
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900 border-b border-dark-750">
        
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'positions'
                ? 'bg-dark-800 text-white border border-dark-650'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Positions</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-dark-700 text-slate-300">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-dark-800 text-white border border-dark-650'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Orders</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-dark-700 text-slate-300">
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-dark-800 text-white border border-dark-650'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trade History / Journal</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-dark-700 text-slate-300">
              {tradeHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'bg-dark-800 text-white border border-dark-650'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-doji-light" />
            <span>Portfolio Summary</span>
          </button>
        </div>

        {/* Right Actions: Export CSV & Recharge Balance */}
        <div className="flex items-center gap-2">
          {activeTab === 'history' && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-mono transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => setRechargeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Recharge Dummy Funds</span>
          </button>
        </div>

      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        
        {/* TAB 1: OPEN POSITIONS */}
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
              <Briefcase className="w-8 h-8 stroke-1 text-slate-600" />
              <p>No open positions in this workspace.</p>
              <p className="text-[11px] text-slate-600 font-sans">Execute a Market or Limit order above to open a position.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-dark-750 text-[11px]">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Side</th>
                    <th className="pb-2 font-medium">Quantity</th>
                    <th className="pb-2 font-medium">Entry Price</th>
                    <th className="pb-2 font-medium">Mark Price</th>
                    <th className="pb-2 font-medium">Leverage</th>
                    <th className="pb-2 font-medium">Margin</th>
                    <th className="pb-2 font-medium">Liq. Price</th>
                    <th className="pb-2 font-medium">Unrealized P&L</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {livePositions.map((pos) => {
                    const isProfit = pos.livePnl >= 0;
                    const flash = flashMap[pos.id];
                    const flashClass = flash === 'up'
                      ? 'bg-bull/20 text-bull border border-bull/40 shadow-sm'
                      : flash === 'down'
                      ? 'bg-bear/20 text-bear border border-bear/40 shadow-sm'
                      : 'text-white';

                    return (
                      <tr key={pos.id} className="hover:bg-dark-800/60 transition-colors">
                        <td className="py-2.5 font-bold text-white">{pos.symbol}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pos.side === 'buy' ? 'bg-bull/15 text-bull border border-bull/30' : 'bg-bear/15 text-bear border border-bear/30'
                          }`}>
                            {pos.side === 'buy' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-200">{pos.quantity}</td>
                        <td className="py-2.5 text-slate-200">{currency}{pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: market === 'forex' ? 4 : 2 })}</td>
                        <td className="py-2.5 font-bold">
                          <span className={`px-2 py-0.5 rounded font-mono inline-block transition-all duration-300 ${flashClass}`}>
                            {currency}{pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: market === 'forex' ? 4 : 2, maximumFractionDigits: market === 'forex' ? 4 : 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 text-doji-light font-semibold">{pos.leverage}x</td>
                        <td className="py-2.5 text-slate-300">{currency}{pos.liveMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2.5 text-amber-400">
                          {pos.liveLiqPrice ? `${currency}${pos.liveLiqPrice.toLocaleString(undefined, { minimumFractionDigits: market === 'forex' ? 4 : 2, maximumFractionDigits: market === 'forex' ? 4 : 2 })}` : '-'}
                        </td>
                        <td className="py-2.5 font-bold">
                          <span className={`${isProfit ? 'text-bull' : 'text-bear'} transition-colors duration-300`}>
                            {isProfit ? '+' : ''}{currency}{pos.livePnl.toFixed(2)} ({isProfit ? '+' : ''}{pos.livePnlPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleClose(pos.id)}
                            disabled={closingId === pos.id}
                            className="px-2.5 py-1 rounded-lg bg-dark-750 hover:bg-bear text-slate-300 hover:text-white border border-dark-650 transition-colors text-[11px]"
                          >
                            {closingId === pos.id ? 'Closing...' : 'Close Position'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 2: PENDING ORDERS */}
        {activeTab === 'orders' && (
          pendingOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
              <Clock className="w-8 h-8 stroke-1 text-slate-600" />
              <p>No pending limit orders awaiting execution.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-dark-750 text-[11px]">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Side</th>
                    <th className="pb-2 font-medium">Limit Price</th>
                    <th className="pb-2 font-medium">Quantity</th>
                    <th className="pb-2 font-medium">Leverage</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {pendingOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-dark-800/60 transition-colors">
                      <td className="py-2.5 font-bold text-white">{ord.symbol}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.side === 'buy' ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
                        }`}>
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-white font-bold">{currency}{ord.price.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-200">{ord.quantity}</td>
                      <td className="py-2.5 text-doji-light">{ord.leverage}x</td>
                      <td className="py-2.5 text-amber-400 font-semibold uppercase text-[10px]">{ord.status}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onCancelOrder(ord.id)}
                          className="px-2 py-1 rounded bg-dark-750 hover:bg-bear text-slate-300 hover:text-white border border-dark-650 transition-colors text-[10px]"
                        >
                          Cancel Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 3: TRADE HISTORY / JOURNAL */}
        {activeTab === 'history' && (
          tradeHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
              <BookOpen className="w-8 h-8 stroke-1 text-slate-600" />
              <p>Trade journal is empty.</p>
              <p className="text-[11px] text-slate-600 font-sans">Executed and closed trades will appear here with performance analytics.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-dark-750 text-[11px]">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Side</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium">Entry</th>
                    <th className="pb-2 font-medium">Exit</th>
                    <th className="pb-2 font-medium">Realized P&L</th>
                    <th className="pb-2 font-medium">Return %</th>
                    <th className="pb-2 font-medium">Holding</th>
                    <th className="pb-2 font-medium">Close Reason</th>
                    <th className="pb-2 font-medium text-right">Closed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {tradeHistory.map((tr) => {
                    const isWin = tr.realized_pnl > 0;
                    return (
                      <tr key={tr.id} className="hover:bg-dark-800/60 transition-colors">
                        <td className="py-2.5 font-bold text-white">{tr.symbol}</td>
                        <td className="py-2.5 uppercase font-bold text-[10px]">
                          <span className={tr.side === 'buy' ? 'text-bull' : 'text-bear'}>{tr.side}</span>
                        </td>
                        <td className="py-2.5 text-slate-300">{tr.quantity}</td>
                        <td className="py-2.5 text-slate-300">{currency}{tr.entry_price.toLocaleString()}</td>
                        <td className="py-2.5 text-white font-bold">{currency}{tr.exit_price.toLocaleString()}</td>
                        <td className="py-2.5 font-bold">
                          <span className={isWin ? 'text-bull' : 'text-bear'}>
                            {isWin ? '+' : ''}{currency}{tr.realized_pnl.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">
                          <span className={isWin ? 'text-bull' : 'text-bear'}>
                            {isWin ? '+' : ''}{tr.return_pct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">{tr.holding_seconds}s</td>
                        <td className="py-2.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-750 text-slate-300 capitalize">
                            {tr.close_reason.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-400 text-[10px]">
                          {new Date(tr.closed_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 4: PORTFOLIO SUMMARY WIDGET */}
        {activeTab === 'summary' && portfolio && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase">Cash Balance</div>
              <div className="text-base font-extrabold text-white mt-1">
                {currency}{cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Total Equity</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono font-bold">LIVE</span>
              </div>
              <div className="text-base font-extrabold text-white mt-1">
                {currency}{liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase">Margin In Use</div>
              <div className="text-base font-bold text-amber-400 mt-1">
                {currency}{totalLiveMarginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Free Margin</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">LIVE</span>
              </div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {currency}{liveFreeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Unrealized P&L</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono font-bold">LIVE</span>
              </div>
              <div className={`text-base font-extrabold mt-1 ${totalLiveUnrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {totalLiveUnrealizedPnl >= 0 ? '+' : ''}{currency}{totalLiveUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase">Realized P&L</div>
              <div className={`text-base font-extrabold mt-1 ${portfolio.realized_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {portfolio.realized_pnl >= 0 ? '+' : ''}{currency}{portfolio.realized_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span>Net Total P&L</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono font-bold">LIVE</span>
              </div>
              <div className={`text-base font-extrabold mt-1 ${totalNetPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {totalNetPnl >= 0 ? '+' : ''}{currency}{totalNetPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase">Win Rate %</div>
              <div className="text-base font-extrabold text-bull mt-1">
                {portfolio.win_rate}% ({portfolio.winning_trades}/{portfolio.total_trades})
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] text-slate-400 uppercase">Largest Drawdown</div>
              <div className="text-base font-bold text-bear mt-1">
                {currency}{portfolio.largest_loss.toFixed(2)}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* RECHARGE BALANCE MODAL */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-dark-600 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Recharge Virtual Dummy Funds</h3>
                <p className="text-xs text-slate-400 font-mono">Segment: {market.toUpperCase()}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-sans">
              This will restore your virtual paper trading allocation back to the initial starting dummy balance (<strong>{market === 'nse' ? '₹10,00,000' : '$200,000'}</strong>). A 60-second cooldown applies after confirmation.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRechargeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-750 border border-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRechargeConfirm}
                disabled={isRecharging}
                className="px-4 py-2 rounded-xl text-xs font-bold text-dark-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {isRecharging ? "Restoring..." : "Confirm Virtual Recharge"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
