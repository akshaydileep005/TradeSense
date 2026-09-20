import asyncio
import time
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.market_data_service import market_data_service

async def test_stale_price_protection():
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            
            # 1. Login
            r = await client.post("/api/auth/demo-login")
            assert r.status_code == 200
            token = r.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Artificially make RELIANCE.NS cache tick stale (> 2.0 seconds)
            market_data_service._live_price_cache["RELIANCE.NS"] = {
                "price": 2980.50,
                "timestamp": time.time() - 3.5,  # 3.5 seconds old (> 2.0s)
                "data": {"symbol": "RELIANCE.NS", "price": 2980.50}
            }

            order_payload = {
                "market": "nse",
                "symbol": "RELIANCE.NS",
                "side": "buy",
                "order_type": "market",
                "quantity": 1,
                "requested_price": 2980.50,
                "leverage": 1
            }

            # 3. Expect 400 Bad Request rejection due to stale price
            r = await client.post("/api/orders/place", json=order_payload, headers=headers)
            assert r.status_code == 400, f"Expected 400 error, got {r.status_code}: {r.text}"
            detail = r.json()["detail"]
            assert "Stale market price" in detail, f"Expected stale price message, got: {detail}"
            assert "Stale price protection active" in detail, f"Expected protection warning, got: {detail}"
            print(f"[TEST PASSED] Stale price protection correctly rejected order with: '{detail}'")

if __name__ == "__main__":
    asyncio.run(test_stale_price_protection())
