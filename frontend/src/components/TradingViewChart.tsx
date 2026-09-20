import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  HistogramSeries, 
  LineSeries, 
  ColorType, 
  CrosshairMode, 
  LineStyle, 
  createSeriesMarkers 
} from 'lightweight-charts';
import type { 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  UTCTimestamp, 
  IPriceLine 
} from 'lightweight-charts';
import type { Candle, DojiAnalysis, Quote } from '../services/api';
import { 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Activity, 
  Layers, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface TradingViewChartProps {
  candles: Candle[];
  symbol: string;
  quote?: Quote;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onAskDoji: () => void;
  dojiAnalysis: DojiAnalysis | null;
  isDojiLoading: boolean;
  currency: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  symbol,
  quote,
  timeframe,
  onTimeframeChange,
  onAskDoji,
  dojiAnalysis,
  isDojiLoading,
  currency
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<any> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<any> | null>(null);
  const markersPluginRef = useRef<any>(null);

  // Price lines for Doji overlays
  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const supLineRef = useRef<IPriceLine | null>(null);
  const resLineRef = useRef<IPriceLine | null>(null);

  // States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showDojiOverlay, setShowDojiOverlay] = useState(true);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e14' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1c2638',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#1c2638',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 520,
    });

    chartRef.current = chart;

    // Add Candlestick Series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00E676',
      downColor: '#FF3B30',
      borderVisible: false,
      wickUpColor: '#00E676',
      wickDownColor: '#FF3B30',
    });
    candlestickSeriesRef.current = candleSeries;

    // Add Volume Histogram Series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Add EMA 20 & 50 Line Series (v5 API)
    const ema20 = chart.addSeries(LineSeries, {
      color: '#38bdf8', // sky blue
      lineWidth: 2,
      title: 'EMA 20',
    });
    ema20SeriesRef.current = ema20;

    const ema50 = chart.addSeries(LineSeries, {
      color: '#fbbf24', // amber
      lineWidth: 2,
      title: 'EMA 50',
    });
    ema50SeriesRef.current = ema50;

    // Add Bollinger Bands
    const bbUpper = chart.addSeries(LineSeries, {
      color: 'rgba(139, 92, 246, 0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: 'BB Upper',
    });
    bbUpperRef.current = bbUpper;

    const bbLower = chart.addSeries(LineSeries, {
      color: 'rgba(139, 92, 246, 0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: 'BB Lower',
    });
    bbLowerRef.current = bbLower;

    // Markers Plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries, []);

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !candles || candles.length === 0) return;

    // Deduplicate and format candles
    const formattedCandles: CandlestickData[] = [];
    const volumeData: any[] = [];
    const ema20Data: any[] = [];
    const ema50Data: any[] = [];
    const bbUpperData: any[] = [];
    const bbLowerData: any[] = [];

    // Helper for EMA
    const closes = candles.map((c) => c.close);
    const computeEmaValues = (period: number) => {
      const k = 2 / (period + 1);
      const res: number[] = [];
      let ema = closes[0];
      for (let i = 0; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
        res.push(ema);
      }
      return res;
    };

    const ema20Vals = computeEmaValues(20);
    const ema50Vals = computeEmaValues(50);

    // Track unique timestamps
    const seenTimes = new Set<number>();

    candles.forEach((c, idx) => {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        formattedCandles.push({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        });

        volumeData.push({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 59, 48, 0.25)',
        });

        ema20Data.push({
          time: c.time as UTCTimestamp,
          value: ema20Vals[idx],
        });

        ema50Data.push({
          time: c.time as UTCTimestamp,
          value: ema50Vals[idx],
        });

        // Bollinger
        const slice = closes.slice(Math.max(0, idx - 19), idx + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
        const std = Math.sqrt(variance);

        bbUpperData.push({
          time: c.time as UTCTimestamp,
          value: mean + (std * 2),
        });
        bbLowerData.push({
          time: c.time as UTCTimestamp,
          value: mean - (std * 2),
        });
      }
    });

    candlestickSeriesRef.current.setData(formattedCandles);

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData);
    }

    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData(showEMA ? ema20Data : []);
    }

    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData(showEMA ? ema50Data : []);
    }

    if (bbUpperRef.current && bbLowerRef.current) {
      bbUpperRef.current.setData(showBollinger ? bbUpperData : []);
      bbLowerRef.current.setData(showBollinger ? bbLowerData : []);
    }

    // Update with live quote if available
    if (quote && formattedCandles.length > 0) {
      const lastCandle = formattedCandles[formattedCandles.length - 1];
      const updatedLast: CandlestickData = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, quote.price),
        low: Math.min(lastCandle.low, quote.price),
        close: quote.price,
      };
      candlestickSeriesRef.current.update(updatedLast);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, quote, showEMA, showBollinger]);

  // Update Doji overlays (Price Lines & Markers)
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    const series = candlestickSeriesRef.current;

    // Clean up existing price lines
    if (entryLineRef.current) series.removePriceLine(entryLineRef.current);
    if (slLineRef.current) series.removePriceLine(slLineRef.current);
    if (tpLineRef.current) series.removePriceLine(tpLineRef.current);
    if (supLineRef.current) series.removePriceLine(supLineRef.current);
    if (resLineRef.current) series.removePriceLine(resLineRef.current);

    entryLineRef.current = null;
    slLineRef.current = null;
    tpLineRef.current = null;
    supLineRef.current = null;
    resLineRef.current = null;

    if (!dojiAnalysis || !showDojiOverlay) {
      if (markersPluginRef.current) {
        markersPluginRef.current.setMarkers([]);
      }
      return;
    }

    // 1. Entry price line
    entryLineRef.current = series.createPriceLine({
      price: dojiAnalysis.suggested_entry,
      color: '#38bdf8',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Doji Entry (${currency}${dojiAnalysis.suggested_entry})`,
    });

    // 2. Stop Loss price line
    slLineRef.current = series.createPriceLine({
      price: dojiAnalysis.suggested_stop_loss,
      color: '#FF3B30',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Doji SL (${currency}${dojiAnalysis.suggested_stop_loss})`,
    });

    // 3. Take Profit price line
    tpLineRef.current = series.createPriceLine({
      price: dojiAnalysis.suggested_take_profit,
      color: '#00E676',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Doji TP (${currency}${dojiAnalysis.suggested_take_profit})`,
    });

    // 4. S/R Zones
    if (dojiAnalysis.support_zone && dojiAnalysis.support_zone[1]) {
      supLineRef.current = series.createPriceLine({
        price: dojiAnalysis.support_zone[1],
        color: '#6366f1',
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        axisLabelVisible: true,
        title: `Support: ${currency}${dojiAnalysis.support_zone[1]}`,
      });
    }

    if (dojiAnalysis.resistance_zone && dojiAnalysis.resistance_zone[0]) {
      resLineRef.current = series.createPriceLine({
        price: dojiAnalysis.resistance_zone[0],
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        axisLabelVisible: true,
        title: `Resistance: ${currency}${dojiAnalysis.resistance_zone[0]}`,
      });
    }

    // 5. Markers on recent candles
    if (candles && candles.length > 0 && markersPluginRef.current) {
      const lastCandle = candles[candles.length - 1];
      const isBull = dojiAnalysis.signal_type === 'bullish';

      markersPluginRef.current.setMarkers([
        {
          time: lastCandle.time as UTCTimestamp,
          position: isBull ? 'belowBar' : 'aboveBar',
          color: isBull ? '#00E676' : '#FF3B30',
          shape: isBull ? 'arrowUp' : 'arrowDown',
          text: `Doji ${isBull ? 'BUY' : 'SELL'} (${dojiAnalysis.confidence}%)`,
        },
      ]);
    }
  }, [dojiAnalysis, showDojiOverlay, candles, currency]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    }, 100);
  };

  const timeframes = ['1m', '5m', '15m', '1h', '1D'];

  return (
    <div className={`relative flex flex-col bg-dark-900 border border-dark-700/80 rounded-2xl overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'h-[580px] w-full'
    }`}>
      
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-dark-950/80 border-b border-dark-700/80 backdrop-blur-md">
        
        {/* Left: Symbol & Quote Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white font-mono">{symbol}</span>
            {quote && (
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                quote.change >= 0 ? 'bg-bull/10 text-bull border border-bull/20' : 'bg-bear/10 text-bear border border-bear/20'
              }`}>
                {currency}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                <span className="ml-1 text-[10px]">({quote.change >= 0 ? '+' : ''}{quote.change_pct}%)</span>
              </span>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-lg border border-dark-700">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-mono rounded font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-doji text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-dark-750'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Technical Overlays & Fullscreen Button */}
        <div className="flex items-center gap-2">
          
          {/* EMA Toggle */}
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
              showEMA
                ? 'bg-dark-800 text-sky-400 border-sky-400/40'
                : 'bg-dark-850 text-slate-400 border-dark-700 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>EMA (20/50)</span>
          </button>

          {/* Bollinger Toggle */}
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
              showBollinger
                ? 'bg-dark-800 text-purple-400 border-purple-400/40'
                : 'bg-dark-850 text-slate-400 border-dark-700 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Bollinger</span>
          </button>

          {/* Doji Overlays Toggle */}
          {dojiAnalysis && (
            <button
              onClick={() => setShowDojiOverlay(!showDojiOverlay)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
                showDojiOverlay
                  ? 'bg-doji/20 text-doji-light border-doji/40'
                  : 'bg-dark-850 text-slate-400 border-dark-700 hover:text-white'
              }`}
            >
              {showDojiOverlay ? <Eye className="w-3 h-3 text-doji-light" /> : <EyeOff className="w-3 h-3" />}
              <span>Doji Setup</span>
            </button>
          )}

          {/* FULLSCREEN TOGGLE (User Request) */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Chart'}
            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-doji-light" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Chart Canvas Area */}
      <div 
        ref={chartContainerRef} 
        className="flex-1 w-full relative bg-dark-900"
      >
        {/* Doji floating action button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onAskDoji}
            disabled={isDojiLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs text-white bg-gradient-to-r from-doji via-indigo-600 to-purple-600 hover:from-doji-dark hover:to-indigo-700 shadow-xl shadow-doji/30 border border-doji-light/30 hover:scale-105 transition-all disabled:opacity-50 animate-doji-pulse"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{isDojiLoading ? "Doji Analyzing..." : "Ask Doji AI"}</span>
          </button>
        </div>

        {/* Confidence Badge Overlay if Doji analysis active */}
        {dojiAnalysis && showDojiOverlay && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950/85 border border-doji/40 backdrop-blur-md text-xs font-mono shadow-xl">
            <span className={`w-2 h-2 rounded-full ${
              dojiAnalysis.signal_type === 'bullish' ? 'bg-bull' : dojiAnalysis.signal_type === 'bearish' ? 'bg-bear' : 'bg-slate-400'
            } animate-ping`} />
            <span className="text-white font-bold">{dojiAnalysis.confidence}% Confidence</span>
            <span className={`uppercase font-bold ${
              dojiAnalysis.signal_type === 'bullish' ? 'text-bull' : dojiAnalysis.signal_type === 'bearish' ? 'text-bear' : 'text-slate-400'
            }`}>
              &bull; {dojiAnalysis.signal_type} Setup
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
