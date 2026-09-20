import asyncio
import time
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.market_data_service import market_data_service

async def test_slippage_and_fresh_execution():
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            
            # 1. Login
            r = await client.post("/api/auth/demo-login")
            assert r.status_code == 200
            token = r.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Update cache tick fresh with price 2980.50
            now = time.time()
            market_data_service._live_price_cache["RELIANCE.NS"] = {
                "price": 2985.00,
                "timestamp": now,
                "data": {"symbol": "RELIANCE.NS", "price": 2985.00, "timestamp": now}
            }

            # 3. User terminal had requested price 2980.00
            order_payload = {
                "market": "nse",
                "symbol": "RELIANCE.NS",
                "side": "buy",
                "order_type": "market",
                "quantity": 1,
                "requested_price": 2980.00,
                "leverage": 1
            }

            r = await client.post("/api/orders/place", json=order_payload, headers=headers)
            assert r.status_code == 200
            data = r.json()
            assert data["success"] is True
            assert data["executed_price"] == 2985.00
            assert data["requested_price"] == 2980.00
            assert data["slippage"] == 5.00  # 2985.00 - 2980.00
            print(f"[TEST PASSED] Slippage correctly recorded: Req={data['requested_price']}, Exec={data['executed_price']}, Slippage={data['slippage']:+}")

if __name__ == "__main__":
    asyncio.run(test_slippage_and_fresh_execution())
