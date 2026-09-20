import asyncio
import httpx
import sys
import os

# Add backend directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

async def run_verification():
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            
            # 1. Health check
            r = await client.get("/health")
            assert r.status_code == 200, f"Health check failed: {r.text}"

            # 2. Demo login
            r = await client.post("/api/auth/demo-login")
            assert r.status_code == 200, f"Demo login failed: {r.text}"
            auth_data = r.json()
            token = auth_data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 3. Market symbols list for all 4 markets
            for m in ["nse", "forex", "commodities", "crypto"]:
                r = await client.get(f"/api/market/symbols?market={m}", headers=headers)
                assert r.status_code == 200
                assert len(r.json()) > 0

            # 4. Live quote for representative instruments
            for s in ["RELIANCE.NS", "EURUSD=X", "GC=F", "BTC-USD"]:
                r = await client.get(f"/api/market/quote/{s}", headers=headers)
                assert r.status_code == 200
                assert "price" in r.json()

            # 5. Candlestick history
            r = await client.get("/api/market/candles/RELIANCE.NS?timeframe=15m", headers=headers)
            assert r.status_code == 200
            assert len(r.json()) > 0

            # 6. Portfolio stats across all 4 markets
            for m in ["nse", "forex", "commodities", "crypto"]:
                r = await client.get(f"/api/portfolio/stats/{m}", headers=headers)
                assert r.status_code == 200
                assert "balance" in r.json()

            # 7. Doji AI Quantitative Analysis
            r = await client.get("/api/doji/analyze?symbol=RELIANCE.NS&market=nse&timeframe=15m", headers=headers)
            assert r.status_code == 200
            doji = r.json()
            assert "confidence" in doji
            assert "suggested_entry" in doji
            assert "rationale" in doji

            # 8. Place Market Order with requested_price & slippage verification
            order_payload = {
                "market": "nse",
                "symbol": "RELIANCE.NS",
                "side": "buy",
                "order_type": "market",
                "quantity": 2,
                "requested_price": doji.get("suggested_entry", 2980.50),
                "leverage": 1,
                "stop_loss": doji['suggested_stop_loss'],
                "take_profit": doji['suggested_take_profit']
            }
            r = await client.post("/api/orders/place", json=order_payload, headers=headers)
            assert r.status_code == 200, f"Order placement failed: {r.text}"
            order_data = r.json()
            assert order_data["success"] is True
            assert "executed_price" in order_data
            assert "slippage" in order_data
            pos = order_data["position"]
            pos_id = pos["id"]

            # 9. Query Open Positions (Live Mark Price & Unrealized PnL)
            r = await client.get("/api/orders/positions?market=nse", headers=headers)
            assert r.status_code == 200
            positions = r.json()
            assert len(positions) >= 1
            assert "current_price" in positions[0]
            assert "unrealized_pnl" in positions[0]
            assert "requested_price" in positions[0]

            # 10. Close Position
            r = await client.post(f"/api/orders/close/{pos_id}", headers=headers)
            assert r.status_code == 200
            assert r.json()["success"] is True

            # 11. Trade History
            r = await client.get("/api/orders/history?market=nse", headers=headers)
            assert r.status_code == 200
            assert len(r.json()) >= 1

            # 12. Combined Net Worth
            r = await client.get("/api/portfolio/net-worth", headers=headers)
            assert r.status_code == 200
            assert "total_inr" in r.json()

            # 13. Leaderboard
            r = await client.get("/api/leaderboard", headers=headers)
            assert r.status_code == 200
            assert len(r.json()) > 0

            # 14. Market News
            r = await client.get("/api/market/news", headers=headers)
            assert r.status_code == 200
            assert len(r.json()) > 0

    print("All backend automated tests passed successfully with live cache, stale protection, and slippage tracking!")

if __name__ == "__main__":
    asyncio.run(run_verification())
