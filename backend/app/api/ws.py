import asyncio
import json
import time
from typing import Set, Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.services.market_data_service import market_data_service
from app.services.trading_engine import trading_engine

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        self._ticker_task: asyncio.Task = None

    def start_background_ticker(self):
        if not self._ticker_task or self._ticker_task.done():
            self._ticker_task = asyncio.create_task(self.run_ticker_service())
        return self._ticker_task

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Default subscribe to all symbols across all markets so ticks stream for all instruments
        all_symbols = [s["symbol"] for m in settings.MARKETS.values() for s in m.symbols]
        self.subscriptions[websocket] = set(all_symbols)
        
        self.start_background_ticker()

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        self.subscriptions.pop(websocket, None)

    def subscribe(self, websocket: WebSocket, symbols: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(symbols)

    async def run_ticker_service(self):
        """Continuous ticker service keeping _live_price_cache fresh (< 1s old) and broadcasting to active WebSockets."""
        all_market_symbols = [s["symbol"] for m in settings.MARKETS.values() for s in m.symbols]
        while True:
            try:
                for symbol in all_market_symbols:
                    # Get latest live micro-tick quote (updates _live_price_cache with time.time())
                    quote = await market_data_service.get_latest_quote(symbol)

                    # Check SL/TP/Limit order triggers in database using live tick price
                    try:
                        async with AsyncSessionLocal() as db:
                            events = await trading_engine.update_open_positions_and_check_triggers(db, symbol, quote["price"])
                            if events and self.active_connections:
                                event_msg = json.dumps({"type": "notification", "events": events})
                                for ws in list(self.active_connections):
                                    try:
                                        await ws.send_text(event_msg)
                                    except Exception:
                                        pass
                    except Exception:
                        pass

                    # Broadcast price tick to subscribers
                    if self.active_connections:
                        payload = json.dumps({"type": "tick", "data": quote})
                        dead_sockets = []
                        for ws, syms in list(self.subscriptions.items()):
                            if symbol in syms:
                                try:
                                    await ws.send_text(payload)
                                except Exception:
                                    dead_sockets.append(ws)

                        for ws in dead_sockets:
                            self.disconnect(ws)

                await asyncio.sleep(0.8)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1.0)

manager = ConnectionManager()

@router.websocket("/ws/prices")
async def websocket_prices_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "subscribe":
                    symbols = msg.get("symbols", [])
                    manager.subscribe(websocket, symbols)
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
