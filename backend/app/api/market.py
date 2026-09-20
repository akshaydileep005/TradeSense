from typing import List
from fastapi import APIRouter, HTTPException, Query
from app.services.market_data_service import market_data_service
from app.services.news_service import news_service
from app.schemas.schemas import Candle, SymbolQuote, NewsItem
from app.core.config import settings

router = APIRouter(prefix="/market", tags=["market"])

@router.get("/symbols")
async def get_symbols(market: str = Query(..., description="nse, forex, commodities, or crypto")):
    if market not in settings.MARKETS:
        raise HTTPException(status_code=400, detail=f"Market '{market}' not found")
    return market_data_service.get_market_symbols(market)

@router.get("/quote/{symbol}", response_model=SymbolQuote)
async def get_quote(symbol: str):
    quote = await market_data_service.get_latest_quote(symbol)
    return quote

@router.get("/candles/{symbol}", response_model=List[Candle])
async def get_candles(
    symbol: str,
    timeframe: str = Query("15m", description="1m, 5m, 15m, 1h, 1D")
):
    candles = await market_data_service.get_candles(symbol, timeframe)
    return candles

@router.get("/news", response_model=List[NewsItem])
async def get_news():
    return await news_service.get_latest_news()
