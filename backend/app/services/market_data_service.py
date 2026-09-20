import asyncio
import time
import random
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import yfinance as yf
from app.core.config import settings

class MarketDataService:
    def __init__(self):
        # In-memory caches: symbol -> { 'quote': dict, 'candles': dict[timeframe, list], 'last_fetched': float }
        self._quote_cache: Dict[str, dict] = {}
        self._candles_cache: Dict[str, Dict[str, dict]] = {}
        self._cache_ttl = 60  # seconds
        self._last_tick_prices: Dict[str, float] = {}
        # Live in-memory price cache: symbol -> { 'price': float, 'timestamp': float (epoch seconds), 'data': dict }
        self._live_price_cache: Dict[str, dict] = {}

    def get_symbol_metadata(self, symbol: str) -> Optional[dict]:
        """Find symbol metadata across all defined markets."""
        for market_key, market_cfg in settings.MARKETS.items():
            for sym_info in market_cfg.symbols:
                if sym_info["symbol"] == symbol:
                    return {**sym_info, "market": market_key, "currency": market_cfg.currency}
        return None

    def get_market_symbols(self, market: str) -> List[dict]:
        """Get all symbols for a given market."""
        if market not in settings.MARKETS:
            return []
        m_cfg = settings.MARKETS[market]
        return [{**s, "market": market, "currency": m_cfg.currency} for s in m_cfg.symbols]

    def get_live_tick(self, symbol: str) -> Optional[dict]:
        """Fetch live tick from in-memory price cache."""
        return self._live_price_cache.get(symbol)

    def update_live_tick(self, symbol: str, price: float, data: Optional[dict] = None) -> dict:
        """Update live tick in in-memory price cache."""
        now = time.time()
        tick = {
            "price": price,
            "timestamp": now,
            "data": data or {"symbol": symbol, "price": price, "timestamp": int(now)}
        }
        self._live_price_cache[symbol] = tick
        return tick

    async def warm_price_cache(self):
        """Pre-warm all symbols across all markets instantly so live cache is immediately populated."""
        for market_key, market_cfg in settings.MARKETS.items():
            for sym_info in market_cfg.symbols:
                sym = sym_info["symbol"]
                meta = {**sym_info, "market": market_key, "currency": market_cfg.currency}
                fb = self._generate_fallback_quote(sym, meta)
                self._live_price_cache[sym] = {
                    "price": fb["price"],
                    "timestamp": time.time(),
                    "data": fb
                }

    async def get_latest_quote(self, symbol: str) -> dict:
        """Fetch latest quote for a symbol with caching and fallback."""
        now = time.time()
        meta = self.get_symbol_metadata(symbol) or {
            "symbol": symbol, "name": symbol, "market": "nse", "currency": "₹"
        }

        cached = self._quote_cache.get(symbol)
        if cached and (now - cached["cached_at"] < self._cache_ttl):
            # Apply slight live micro-variation for paper trading responsiveness
            current = self._apply_micro_tick(cached["data"])
            self._live_price_cache[symbol] = {
                "price": current["price"],
                "timestamp": time.time(),
                "data": current
            }
            return current

        # Fetch in thread pool from yfinance
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._fetch_yfinance_quote, symbol, meta)
            self._quote_cache[symbol] = {"data": data, "cached_at": now}
            self._last_tick_prices[symbol] = data["price"]
            self._live_price_cache[symbol] = {
                "price": data["price"],
                "timestamp": time.time(),
                "data": data
            }
            return data
        except Exception as e:
            # Fallback to simulated realistic quote if offline or network error
            fb = self._generate_fallback_quote(symbol, meta)
            self._live_price_cache[symbol] = {
                "price": fb["price"],
                "timestamp": time.time(),
                "data": fb
            }
            return fb

    def _fetch_yfinance_quote(self, symbol: str, meta: dict) -> dict:
        """Synchronous fetch from yfinance."""
        ticker = yf.Ticker(symbol)
        fast_info = getattr(ticker, "fast_info", None)
        
        price = 0.0
        prev_close = 0.0
        high = 0.0
        low = 0.0
        volume = 0.0

        if fast_info:
            try:
                price = float(fast_info.last_price or 0.0)
                prev_close = float(fast_info.previous_close or price)
                high = float(fast_info.day_high or price)
                low = float(fast_info.day_low or price)
                volume = float(fast_info.last_volume or 100000.0)
            except Exception:
                pass

        if price <= 0:
            # Try history 2d
            hist = ticker.history(period="2d", interval="1d")
            if not hist.empty:
                latest = hist.iloc[-1]
                price = float(latest["Close"])
                prev_close = float(hist.iloc[0]["Close"]) if len(hist) > 1 else price
                high = float(latest["High"])
                low = float(latest["Low"])
                volume = float(latest["Volume"])

        if price <= 0:
            return self._generate_fallback_quote(symbol, meta)

        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0.0

        return {
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "market": meta.get("market", "nse"),
            "price": round(price, 4 if meta.get("market") == "forex" else 2),
            "change": round(change, 4 if meta.get("market") == "forex" else 2),
            "change_pct": round(change_pct, 2),
            "high": round(high, 4 if meta.get("market") == "forex" else 2),
            "low": round(low, 4 if meta.get("market") == "forex" else 2),
            "volume": volume,
            "currency": meta.get("currency", "$"),
            "timestamp": int(time.time())
        }

    def _generate_fallback_quote(self, symbol: str, meta: dict) -> dict:
        """Realistic baseline price fallbacks."""
        base_prices = {
            "RELIANCE.NS": 2980.50, "TCS.NS": 4210.00, "HDFCBANK.NS": 1640.25,
            "INFY.NS": 1890.00, "ICICIBANK.NS": 1210.00, "TATAMOTORS.NS": 985.00,
            "SBIN.NS": 815.50, "BHARTIARTL.NS": 1540.00, "ITC.NS": 495.00,
            "LT.NS": 3650.00, "^NSEI": 24850.00, "^NSEBANK": 51200.00,
            "EURUSD=X": 1.0850, "GBPUSD=X": 1.2950, "USDJPY=X": 152.40,
            "AUDUSD=X": 0.6620, "USDCHF=X": 0.8840, "USDCAD=X": 1.3850,
            "GC=F": 2680.00, "SI=F": 31.50, "CL=F": 72.80, "NG=F": 2.75,
            "BTC-USD": 67450.00, "ETH-USD": 2620.00, "SOL-USD": 168.50,
            "BNB-USD": 585.00, "XRP-USD": 0.5420
        }
        price = base_prices.get(symbol, 100.0)
        # Check if we have a tracked last price
        if symbol in self._last_tick_prices:
            price = self._last_tick_prices[symbol]
        
        jitter = price * random.uniform(-0.003, 0.003)
        price = max(price + jitter, 0.0001)
        self._last_tick_prices[symbol] = price
        
        is_forex = meta.get("market") == "forex"
        return {
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "market": meta.get("market", "nse"),
            "price": round(price, 4 if is_forex else 2),
            "change": round(jitter, 4 if is_forex else 2),
            "change_pct": round(jitter / price * 100, 2),
            "high": round(price * 1.01, 4 if is_forex else 2),
            "low": round(price * 0.99, 4 if is_forex else 2),
            "volume": 2500000.0,
            "currency": meta.get("currency", "$"),
            "timestamp": int(time.time())
        }

    def _apply_micro_tick(self, quote: dict) -> dict:
        """Create a micro tick update for real-time paper trading feel."""
        prev_price = quote["price"]
        is_forex = quote.get("market") == "forex"
        step = 0.0002 if is_forex else (0.05 if quote["price"] < 100 else 0.5)
        
        delta = random.choice([-1, 0, 1]) * step
        new_price = max(prev_price + delta, 0.0001)
        
        quote_copy = quote.copy()
        quote_copy["price"] = round(new_price, 4 if is_forex else 2)
        quote_copy["timestamp"] = int(time.time())
        self._last_tick_prices[quote["symbol"]] = new_price
        self._live_price_cache[quote["symbol"]] = {
            "price": quote_copy["price"],
            "timestamp": time.time(),
            "data": quote_copy
        }
        return quote_copy

    async def get_candles(self, symbol: str, timeframe: str = "15m") -> List[dict]:
        """Get OHLCV candlestick historical bars."""
        now = time.time()
        if symbol in self._candles_cache and timeframe in self._candles_cache[symbol]:
            cached_entry = self._candles_cache[symbol][timeframe]
            if now - cached_entry["cached_at"] < 300:  # 5 min cache
                return cached_entry["candles"]

        loop = asyncio.get_event_loop()
        try:
            candles = await loop.run_in_executor(None, self._fetch_yfinance_candles, symbol, timeframe)
            if not candles or len(candles) < 10:
                candles = self._generate_synthetic_candles(symbol, timeframe)
        except Exception:
            candles = self._generate_synthetic_candles(symbol, timeframe)

        if symbol not in self._candles_cache:
            self._candles_cache[symbol] = {}
        self._candles_cache[symbol][timeframe] = {"candles": candles, "cached_at": now}
        return candles

    def _fetch_yfinance_candles(self, symbol: str, timeframe: str) -> List[dict]:
        """Fetch historical candles from yfinance."""
        tf_map = {
            "1m": ("1d", "1m"),
            "5m": ("5d", "5m"),
            "15m": ("5d", "15m"),
            "1h": ("1mo", "60m"),
            "1D": ("1y", "1d")
        }
        period, interval = tf_map.get(timeframe, ("5d", "15m"))
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return []

        df = df.reset_index()
        # Find datetime column
        date_col = "Date" if "Date" in df.columns else "Datetime"
        if date_col not in df.columns:
            date_col = df.columns[0]

        candles = []
        for _, row in df.iterrows():
            ts = row[date_col]
            if hasattr(ts, "timestamp"):
                unix_time = int(ts.timestamp())
            else:
                unix_time = int(time.time())
            
            o = float(row.get("Open", 0.0))
            h = float(row.get("High", 0.0))
            l = float(row.get("Low", 0.0))
            c = float(row.get("Close", 0.0))
            v = float(row.get("Volume", 0.0))

            if o > 0 and h > 0 and l > 0 and c > 0:
                candles.append({
                    "time": unix_time,
                    "open": round(o, 4 if "forex" in symbol.lower() or "=X" in symbol else 2),
                    "high": round(h, 4 if "forex" in symbol.lower() or "=X" in symbol else 2),
                    "low": round(l, 4 if "forex" in symbol.lower() or "=X" in symbol else 2),
                    "close": round(c, 4 if "forex" in symbol.lower() or "=X" in symbol else 2),
                    "volume": round(v, 2)
                })

        # Keep last 250 bars
        return candles[-250:]

    def _generate_synthetic_candles(self, symbol: str, timeframe: str) -> List[dict]:
        """Generate realistic synthetic candlestick history."""
        base_quote = self._generate_fallback_quote(symbol, self.get_symbol_metadata(symbol) or {})
        last_price = base_quote["price"]
        
        # Step in seconds
        step_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1D": 86400}.get(timeframe, 900)
        num_bars = 120
        now = int(time.time())
        start_time = now - (num_bars * step_seconds)

        candles = []
        curr = last_price * 0.95
        volatility = 0.002 if "=X" in symbol else 0.006

        for i in range(num_bars):
            bar_time = start_time + (i * step_seconds)
            open_p = curr
            change_p = open_p * random.normalvariate(0.0003, volatility)
            close_p = max(open_p + change_p, 0.0001)
            high_p = max(open_p, close_p) + abs(open_p * random.uniform(0.0005, volatility * 1.2))
            low_p = min(open_p, close_p) - abs(open_p * random.uniform(0.0005, volatility * 1.2))
            volume = random.uniform(10000, 500000)

            is_forex = "=X" in symbol
            candles.append({
                "time": bar_time,
                "open": round(open_p, 4 if is_forex else 2),
                "high": round(high_p, 4 if is_forex else 2),
                "low": round(low_p, 4 if is_forex else 2),
                "close": round(close_p, 4 if is_forex else 2),
                "volume": round(volume, 2)
            })
            curr = close_p

        return candles

market_data_service = MarketDataService()
