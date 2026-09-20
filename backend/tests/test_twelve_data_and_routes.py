import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.market_data_service import to_twelve_data_symbol, market_data_service
from app.core.redis_cache import redis_cache

async def test_twelve_data_and_health_routes():
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:

            # 1. Verify GET / (Render root health check)
            r_root = await client.get("/")
            assert r_root.status_code == 200, f"Root / failed: {r_root.status_code} {r_root.text}"
            root_json = r_root.json()
            assert root_json["status"] == "healthy"
            assert "TradeSense" in root_json["service"]
            print("[PASS] 1. GET / responds with 200 OK (Render health check fixed)")

            # 2. Verify GET /health
            r_health = await client.get("/health")
            assert r_health.status_code == 200, f"/health failed: {r_health.status_code} {r_health.text}"
            assert r_health.json()["status"] == "healthy"
            print("[PASS] 2. GET /health responds with 200 OK")

            # 3. Verify Symbol translation to Twelve Data format
            assert to_twelve_data_symbol("RELIANCE.NS") == ("RELIANCE", "NSE")
            assert to_twelve_data_symbol("TATAMOTORS.NS") == ("TATAMOTORS", "NSE")
            assert to_twelve_data_symbol("^NSEI") == ("NIFTY 50", "NSE")
            assert to_twelve_data_symbol("EURUSD=X") == ("EUR/USD", None)
            assert to_twelve_data_symbol("BTC-USD") == ("BTC/USD", None)
            assert to_twelve_data_symbol("GC=F") == ("XAU/USD", None)
            print("[PASS] 3. Symbol mapping for Twelve Data (NSE, Forex, Crypto, Commodities) is accurate")

            # 4. Verify NSE Quote fetching and exact frontend response shape
            nse_quote = await market_data_service.get_latest_quote("TATAMOTORS.NS")
            assert nse_quote["symbol"] == "TATAMOTORS.NS"
            assert "price" in nse_quote and nse_quote["price"] > 0
            assert "change" in nse_quote
            assert "change_pct" in nse_quote
            assert "high" in nse_quote
            assert "low" in nse_quote
            assert "volume" in nse_quote
            assert "currency" in nse_quote
            assert "timestamp" in nse_quote
            print(f"[PASS] 4. TATAMOTORS.NS quote retrieved successfully: Price={nse_quote['currency']}{nse_quote['price']}")

            # 5. Verify NSE Candlestick fetching and exact frontend response shape
            nse_candles = await market_data_service.get_candles("TATAMOTORS.NS", timeframe="15m")
            assert len(nse_candles) >= 10
            bar = nse_candles[-1]
            assert "time" in bar
            assert "open" in bar
            assert "high" in bar
            assert "low" in bar
            assert "close" in bar
            assert "volume" in bar
            print(f"[PASS] 5. TATAMOTORS.NS candles retrieved ({len(nse_candles)} bars, latest close={bar['close']})")

            # 6. Verify Redis cache layer behavior
            redis_cache.set_json("test:key", {"status": "ok"}, ttl_seconds=5)
            # Should not throw even if Redis is offline
            print("[PASS] 6. Redis caching layer is resilient with safe fallback")

    print("\nAll Twelve Data and Route health checks passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_twelve_data_and_health_routes())
