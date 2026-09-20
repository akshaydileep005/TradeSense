import React, { useState, useEffect } from 'react';
import { 
  api, 
  SymbolInfo, 
  Quote, 
  Candle, 
  Position, 
  Order, 
  TradeHistory, 
  PortfolioStats, 
  DojiAnalysis 
} from '../services/api';
import { WatchlistPanel } from '../components/WatchlistPanel';
import { TradingViewChart } from '../components/TradingViewChart';
import { OrderPanel } from '../components/OrderPanel';
import { BottomTerminalTabs } from '../components/BottomTerminalTabs';
import { DojiPanel } from '../components/DojiPanel';
import { 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Wallet, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';

interface WorkspacePageProps {
  market: 'nse' | 'forex' | 'commodities' | 'crypto';
  onBackToMarketSelect: () => void;
  quotes: Record<string, Quote>;
  onRefreshData: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  market,
  onBackToMarketSelect,
  quotes,
  onRefreshData
}) => {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioStats | undefined>(undefined);
  
  // Doji AI state
  const [dojiAnalysis, setDojiAnalysis] = useState<DojiAnalysis | null>(null);
  const [isDojiLoading, setIsDojiLoading] = useState(false);
  const [isDojiPanelOpen, setIsDojiPanelOpen] = useState(false);
  const [prefillOrderSetup, setPrefillOrderSetup] = useState<{
    entry: number;
    sl: number;
    tp: number;
    side: 'buy' | 'sell';
  } | null>(null);

  // Market metadata
  const currency = market === 'nse' ? '₹' : '$';
  const maxLeverage = market === 'forex' || market === 'crypto' ? 20 : market === 'commodities' ? 10 : 5;

  // 1. Fetch initial symbols for this market
  useEffect(() => {
    api.getSymbols(market)
      .then((data) => {
        setSymbols(data);
        if (data.length > 0) {
          setSelectedSymbol(data[0].symbol);
        }
      })
      .catch(console.error);

    loadPortfolioAndPositions();
  }, [market]);

  // 2. Fetch candles when selectedSymbol or timeframe changes
  useEffect(() => {
    if (!selectedSymbol) return;

    api.getCandles(selectedSymbol, timeframe)
      .then((data) => {
        setCandles(data);
      })
      .catch(console.error);

    // Reset Doji when changing symbol
    setDojiAnalysis(null);
  }, [selectedSymbol, timeframe]);

  const loadPortfolioAndPositions = async () => {
    try {
      const [port, pos, ord, hist] = await Promise.all([
        api.getPortfolioStats(market),
        api.getPositions(market),
        api.getPendingOrders(market),
        api.getTradeHistory(market),
      ]);
      setPortfolio(port);
      setPositions(pos);
      setPendingOrders(ord);
      setTradeHistory(hist);
    } catch (err) {
      console.error("Error loading workspace data", err);
    }
  };

  // Trigger Doji Analysis
  const handleAskDoji = async () => {
    if (!selectedSymbol) return;
    setIsDojiLoading(true);
    setIsDojiPanelOpen(true);
    try {
      const result = await api.analyzeWithDoji(selectedSymbol, market, timeframe);
      setDojiAnalysis(result);
    } catch (err) {
      console.error("Failed to run Doji analysis", err);
    } finally {
      setIsDojiLoading(false);
    }
  };

  // Place Order handler
  const handlePlaceOrder = async (orderData: any) => {
    const res = await api.placeOrder(orderData);
    await loadPortfolioAndPositions();
    onRefreshData();
    return res;
  };

  // Close Position handler
  const handleClosePosition = async (positionId: string) => {
    await api.closePosition(positionId);
    await loadPortfolioAndPositions();
    onRefreshData();
  };

  // Cancel Order handler
  const handleCancelOrder = async (orderId: string) => {
    await api.cancelOrder(orderId);
    await loadPortfolioAndPositions();
  };

  // Recharge Balance handler
  const handleRechargeBalance = async () => {
    await api.recharge(market);
    await loadPortfolioAndPositions();
    onRefreshData();
  };

  // Export CSV handler
  const handleExportCsv = () => {
    const url = api.getExportCsvUrl(market);
    window.open(url, '_blank');
  };

  // Adopt Doji Setup
  const handleApplyDojiSetup = (entry: number, sl: number, tp: number, side: 'buy' | 'sell') => {
    setPrefillOrderSetup({ entry, sl, tp, side });
    setIsDojiPanelOpen(false);
  };

  const activeQuote = quotes[selectedSymbol];

  // Dynamic live aggregations for top bar
  const totalLiveUnrealizedPnl = positions.reduce((sum, pos) => {
    const q = quotes[pos.symbol];
    const mark = q ? q.price : pos.current_price;
    const isShort = pos.side.toLowerCase() === 'sell';
    const diff = mark - pos.entry_price;
    const pnl = isShort ? -diff * pos.quantity : diff * pos.quantity;
    return sum + pnl;
  }, 0);

  const totalLiveMargin = positions.reduce((sum, pos) => {
    const q = quotes[pos.symbol];
    const mark = q ? q.price : pos.current_price;
    return sum + (mark * pos.quantity) / (pos.leverage || 1);
  }, 0);

  const liveEquity = portfolio ? portfolio.balance + totalLiveUnrealizedPnl : 0;
  const liveFreeMargin = portfolio ? Math.max(0, liveEquity - totalLiveMargin) : 0;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-dark-900 text-slate-100 flex flex-col justify-between p-3 sm:p-4 space-y-3 font-sans">
      
      {/* Top Workspace Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-850 border border-dark-700/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMarketSelect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch Market</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {market === 'nse' ? 'NSE Equities' : market === 'forex' ? 'Forex Currency' : market === 'commodities' ? 'Commodities' : 'Crypto Assets'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-750 text-slate-400 border border-dark-700">
              Max {maxLeverage}x
            </span>
          </div>
        </div>

        {/* Portfolio quick glance in top bar */}
        {portfolio && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:block">
              <span className="text-slate-400">Equity: </span>
              <span className="font-bold text-white">{currency}{liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-400">Avail. Margin: </span>
              <span className="font-bold text-emerald-400">{currency}{liveFreeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {positions.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                <span className="text-slate-400">Live P&L: </span>
                <span className={`font-bold ${totalLiveUnrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {totalLiveUnrealizedPnl >= 0 ? '+' : ''}{currency}{totalLiveUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Terminal Grid: Left (Watchlist), Center (TradingView Chart), Right (Order Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
        
        {/* LEFT COLUMN: Watchlist (3 cols) */}
        <div className="lg:col-span-3 h-[580px]">
          <WatchlistPanel
            symbols={symbols}
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            currency={currency}
          />
        </div>

        {/* CENTER COLUMN: TradingView Chart (6 cols) */}
        <div className="lg:col-span-6 h-[580px]">
          <TradingViewChart
            candles={candles}
            symbol={selectedSymbol}
            quote={activeQuote}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onAskDoji={handleAskDoji}
            dojiAnalysis={dojiAnalysis}
            isDojiLoading={isDojiLoading}
            currency={currency}
          />
        </div>

        {/* RIGHT COLUMN: Order Panel (3 cols) */}
        <div className="lg:col-span-3 h-[580px]">
          <OrderPanel
            symbol={selectedSymbol}
            market={market}
            quote={activeQuote}
            portfolio={portfolio}
            currency={currency}
            maxLeverage={maxLeverage}
            onPlaceOrder={handlePlaceOrder}
            prefillSetup={prefillOrderSetup}
          />
        </div>

      </div>

      {/* BOTTOM SECTION: Positions, Pending Orders, Trade Journal Tabs */}
      <div className="w-full">
        <BottomTerminalTabs
          positions={positions}
          pendingOrders={pendingOrders}
          tradeHistory={tradeHistory}
          portfolio={portfolio}
          currency={currency}
          market={market}
          quotes={quotes}
          onClosePosition={handleClosePosition}
          onCancelOrder={handleCancelOrder}
          onRechargeBalance={handleRechargeBalance}
          onExportCsv={handleExportCsv}
        />
      </div>

      {/* Slide-in Doji AI Co-Pilot Panel */}
      <DojiPanel
        isOpen={isDojiPanelOpen}
        onClose={() => setIsDojiPanelOpen(false)}
        analysis={dojiAnalysis}
        isLoading={isDojiLoading}
        onApplySetup={handleApplyDojiSetup}
        currency={currency}
      />

    </div>
  );
};
