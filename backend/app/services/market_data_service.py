import asyncio
import time
import random
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone
import httpx
import yfinance as yf
from app.core.config import settings
from app.core.redis_cache import redis_cache

logger = logging.getLogger("tradesense.market_data")

def to_twelve_data_symbol(symbol: str) -> Tuple[str, Optional[str]]:
    """Map internal symbol to Twelve Data symbol and optional exchange."""
    if symbol.endswith(".NS"):
        return symbol.replace(".NS", ""), "NSE"
    if symbol == "^NSEI":
        return "NIFTY 50", "NSE"
    if symbol == "^NSEBANK":
        return "NIFTY BANK", "NSE"
    if "=X" in symbol:
        # Forex: EURUSD=X -> EUR/USD
        base = symbol.replace("=X", "")
        if len(base) == 6:
            return f"{base[:3]}/{base[3:]}", None
        return base, None
    if "-USD" in symbol:
        # Crypto: BTC-USD -> BTC/USD
        base = symbol.replace("-USD", "")
        return f"{base}/USD", None
    if symbol == "GC=F":
        return "XAU/USD", None  # Gold
    if symbol == "SI=F":
        return "XAG/USD", None  # Silver
    if symbol == "CL=F":
        return "WTI/USD", None  # Crude Oil
    if symbol == "NG=F":
        return "NG/USD", None   # Natural Gas
    if symbol == "HG=F":
        return "COPPER", None   # Copper
    if symbol == "PL=F":
        return "PLATINUM", None # Platinum
    return symbol, None

class MarketDataService:
    def __init__(self):
        # In-memory caches: symbol -> { 'quote': dict, 'candles': dict[timeframe, list], 'last_fetched': float }
        self._quote_cache: Dict[str, dict] = {}
        self._candles_cache: Dict[str, Dict[str, dict]] = {}
        self._cache_ttl = 10  # seconds
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
        """Fetch latest quote with Redis caching (8-10s TTL) and Twelve Data / fallback."""
        now = time.time()
        meta = self.get_symbol_metadata(symbol) or {
            "symbol": symbol, "name": symbol, "market": "nse", "currency": "₹"
        }
        is_nse = meta.get("market") == "nse" or symbol.endswith(".NS") or symbol.startswith("^NSE")

        # 1. Check Redis cache first (TTL 8 seconds)
        redis_key = f"tradesense:quote:{symbol}"
        cached_redis = redis_cache.get_json(redis_key)
        if cached_redis:
            # Apply slight live micro-variation for paper trading responsiveness
            current = self._apply_micro_tick(cached_redis)
            self._live_price_cache[symbol] = {
                "price": current["price"],
                "timestamp": now,
                "data": current
            }
            return current

        # 2. Check local in-memory cache (TTL 8 seconds)
        cached_local = self._quote_cache.get(symbol)
        if cached_local and (now - cached_local["cached_at"] < 8.0):
            current = self._apply_micro_tick(cached_local["data"])
            self._live_price_cache[symbol] = {
                "price": current["price"],
                "timestamp": now,
                "data": current
            }
            return current

        # 3. Fetch from Twelve Data (Primary for NSE, or whenever key is configured)
        data = None
        if settings.TWELVE_DATA_API_KEY and (is_nse or settings.TWELVE_DATA_API_KEY):
            data = await self._fetch_twelve_data_quote(symbol, meta)

        # 4. If not NSE and Twelve Data was not used, try yfinance
        if not data and not is_nse:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, self._fetch_yfinance_quote, symbol, meta)
            except Exception:
                data = None

        # 5. If still no data or NSE without API key, use simulated realistic quote generator
        if not data:
            data = self._generate_fallback_quote(symbol, meta)

        # Cache in Redis for 8 seconds to stay safely within rate limits
        redis_cache.set_json(redis_key, data, ttl_seconds=8)

        # Cache in local in-memory dictionaries
        self._quote_cache[symbol] = {"data": data, "cached_at": now}
        self._last_tick_prices[symbol] = data["price"]
        self._live_price_cache[symbol] = {
            "price": data["price"],
            "timestamp": now,
            "data": data
        }
        return data

    async def _fetch_twelve_data_quote(self, symbol: str, meta: dict) -> Optional[dict]:
        """Fetch live quote from Twelve Data REST API."""
        api_key = settings.TWELVE_DATA_API_KEY
        if not api_key:
            return None

        td_symbol, exchange = to_twelve_data_symbol(symbol)
        params = {
            "symbol": td_symbol,
            "apikey": api_key
        }
        if exchange:
            params["exchange"] = exchange

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get("https://api.twelvedata.com/quote", params=params)
                if resp.status_code != 200:
                    logger.warning(f"Twelve Data quote HTTP {resp.status_code} for {symbol}")
                    return None
                data = resp.json()
                if data.get("status") == "error" or "code" in data:
                    logger.warning(f"Twelve Data API notice for {symbol}: {data.get('message', data)}")
                    return None

                price = float(data.get("close") or data.get("price") or 0.0)
                if price <= 0:
                    return None

                prev_close = float(data.get("previous_close") or price)
                high = float(data.get("high") or price)
                low = float(data.get("low") or price)
                volume = float(data.get("volume") or 1500000.0)
                change = float(data.get("change") or (price - prev_close))
                change_pct = float(data.get("percent_change") or ((change / prev_close * 100) if prev_close else 0.0))

                is_forex = meta.get("market") == "forex"
                return {
                    "symbol": symbol,
                    "name": meta.get("name", data.get("name", symbol)),
                    "market": meta.get("market", "nse"),
                    "price": round(price, 4 if is_forex else 2),
                    "change": round(change, 4 if is_forex else 2),
                    "change_pct": round(change_pct, 2),
                    "high": round(high, 4 if is_forex else 2),
                    "low": round(low, 4 if is_forex else 2),
                    "volume": volume,
                    "currency": meta.get("currency", "₹" if meta.get("market") == "nse" else "$"),
                    "timestamp": int(time.time())
                }
        except Exception as e:
            logger.warning(f"Twelve Data quote error for {symbol}: {e}")
            return None

    def _fetch_yfinance_quote(self, symbol: str, meta: dict) -> dict:
        """Synchronous fetch from yfinance for non-NSE symbols."""
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

        is_forex = meta.get("market") == "forex"
        return {
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "market": meta.get("market", "nse"),
            "price": round(price, 4 if is_forex else 2),
            "change": round(change, 4 if is_forex else 2),
            "change_pct": round(change_pct, 2),
            "high": round(high, 4 if is_forex else 2),
            "low": round(low, 4 if is_forex else 2),
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
        if symbol in self._last_tick_prices:
            price = self._last_tick_prices[symbol]
        
        jitter = price * random.uniform(-0.002, 0.002)
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
            "currency": meta.get("currency", "₹" if meta.get("market") == "nse" else "$"),
            "timestamp": int(time.time())
        }

    def _apply_micro_tick(self, quote: dict) -> dict:
        """Create a micro tick update for real-time paper trading feel."""
        prev_price = self._last_tick_prices.get(quote["symbol"], quote["price"])
        is_forex = quote.get("market") == "forex"
        step = 0.0002 if is_forex else (0.05 if prev_price < 100 else 0.5)
        
        # Non-zero jitter: +/- step so price visibly moves on every tick
        direction = random.choice([-1, 1])
        new_price = max(round(prev_price + direction * step, 4 if is_forex else 2), 0.0001)
        self._last_tick_prices[quote["symbol"]] = new_price
        
        # Calculate fresh change and change_pct relative to base close
        base_prev_close = quote["price"] - quote.get("change", 0.0)
        if base_prev_close <= 0:
            base_prev_close = quote["price"]
        
        new_change = round(new_price - base_prev_close, 4 if is_forex else 2)
        new_pct = round((new_change / base_prev_close * 100), 2) if base_prev_close else 0.0
        
        quote_copy = quote.copy()
        quote_copy["price"] = new_price
        quote_copy["change"] = new_change
        quote_copy["change_pct"] = new_pct
        quote_copy["high"] = max(quote.get("high", new_price), new_price)
        quote_copy["low"] = min(quote.get("low", new_price), new_price)
        quote_copy["timestamp"] = int(time.time())
        
        self._live_price_cache[quote["symbol"]] = {
            "price": new_price,
            "timestamp": time.time(),
            "data": quote_copy
        }
        return quote_copy

    async def get_candles(self, symbol: str, timeframe: str = "15m") -> List[dict]:
        """Get OHLCV candlestick historical bars with Redis caching (60s TTL)."""
        now = time.time()
        redis_key = f"tradesense:candles:{symbol}:{timeframe}"
        
        # 1. Check Redis cache (TTL 60s)
        cached_redis = redis_cache.get_json(redis_key)
        if cached_redis and len(cached_redis) >= 10:
            return cached_redis

        # 2. Check local in-memory cache (TTL 60s)
        if symbol in self._candles_cache and timeframe in self._candles_cache[symbol]:
            cached_entry = self._candles_cache[symbol][timeframe]
            if now - cached_entry["cached_at"] < 60:
                return cached_entry["candles"]

        meta = self.get_symbol_metadata(symbol) or {}
        is_nse = meta.get("market") == "nse" or symbol.endswith(".NS") or symbol.startswith("^NSE")

        # 3. Fetch from Twelve Data (Primary for NSE, or if key configured)
        candles = None
        if settings.TWELVE_DATA_API_KEY and (is_nse or settings.TWELVE_DATA_API_KEY):
            candles = await self._fetch_twelve_data_candles(symbol, timeframe)

        # 4. If not NSE and Twelve Data was not used, try yfinance
        if not candles and not is_nse:
            loop = asyncio.get_event_loop()
            try:
                candles = await loop.run_in_executor(None, self._fetch_yfinance_candles, symbol, timeframe)
            except Exception:
                candles = None

        # 5. If still no candles or NSE without API key, generate synthetic candlestick history
        if not candles or len(candles) < 10:
            candles = self._generate_synthetic_candles(symbol, timeframe)

        # Cache in Redis for 60 seconds
        redis_cache.set_json(redis_key, candles, ttl_seconds=60)

        # Cache in local memory
        if symbol not in self._candles_cache:
            self._candles_cache[symbol] = {}
        self._candles_cache[symbol][timeframe] = {"candles": candles, "cached_at": now}
        return candles

    async def _fetch_twelve_data_candles(self, symbol: str, timeframe: str) -> Optional[List[dict]]:
        """Fetch historical OHLCV bars from Twelve Data REST API."""
        api_key = settings.TWELVE_DATA_API_KEY
        if not api_key:
            return None

        td_symbol, exchange = to_twelve_data_symbol(symbol)
        tf_map = {
            "1m": "1min",
            "5m": "5min",
            "15m": "15min",
            "1h": "1h",
            "1D": "1day"
        }
        interval = tf_map.get(timeframe, "15min")
        params = {
            "symbol": td_symbol,
            "interval": interval,
            "outputsize": 120,
            "apikey": api_key
        }
        if exchange:
            params["exchange"] = exchange

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://api.twelvedata.com/time_series", params=params)
                if resp.status_code != 200:
                    logger.warning(f"Twelve Data time_series HTTP {resp.status_code} for {symbol}")
                    return None
                data = resp.json()
                if data.get("status") == "error" or "values" not in data:
                    logger.warning(f"Twelve Data candles notice for {symbol}: {data.get('message', 'No values')}")
                    return None

                values = data.get("values", [])
                if not values:
                    return None

                is_forex = "forex" in symbol.lower() or "=X" in symbol

                candles = []
                # Twelve Data returns newest first, reverse to chronological order
                for row in reversed(values):
                    dt_str = row.get("datetime", "")
                    try:
                        if " " in dt_str:
                            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                        else:
                            dt = datetime.strptime(dt_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        unix_time = int(dt.timestamp())
                    except Exception:
                        unix_time = int(time.time())

                    o = float(row.get("open", 0.0))
                    h = float(row.get("high", 0.0))
                    l = float(row.get("low", 0.0))
                    c = float(row.get("close", 0.0))
                    v = float(row.get("volume", 0.0))

                    if o > 0 and h > 0 and l > 0 and c > 0:
                        candles.append({
                            "time": unix_time,
                            "open": round(o, 4 if is_forex else 2),
                            "high": round(h, 4 if is_forex else 2),
                            "low": round(l, 4 if is_forex else 2),
                            "close": round(c, 4 if is_forex else 2),
                            "volume": round(v, 2)
                        })
                return candles if len(candles) >= 5 else None
        except Exception as e:
            logger.warning(f"Twelve Data candles error for {symbol}: {e}")
            return None

    def _fetch_yfinance_candles(self, symbol: str, timeframe: str) -> List[dict]:
        """Fetch historical candles from yfinance for non-NSE symbols."""
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

        return candles[-250:]

    def _generate_synthetic_candles(self, symbol: str, timeframe: str) -> List[dict]:
        """Generate realistic synthetic candlestick history."""
        base_quote = self._generate_fallback_quote(symbol, self.get_symbol_metadata(symbol) or {})
        last_price = base_quote["price"]
        
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
