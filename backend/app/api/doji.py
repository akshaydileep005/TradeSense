from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import json
from app.core.database import get_db
from app.models.models import User, DojiSignalRecord
from app.schemas.schemas import DojiAnalysisResponse
from app.api.auth import get_current_user
from app.services.ai_engine import doji_ai_engine
from app.services.market_data_service import market_data_service

router = APIRouter(prefix="/doji", tags=["doji"])

@router.get("/analyze", response_model=DojiAnalysisResponse)
async def analyze_symbol(
    symbol: str = Query(...),
    market: str = Query(...),
    timeframe: str = Query("15m"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch candlestick data
    candles = await market_data_service.get_candles(symbol, timeframe)
    analysis = doji_ai_engine.analyze(candles, symbol, market, timeframe)

    # Persist record for audit / Doji vs You comparisons
    record = DojiSignalRecord(
        symbol=symbol,
        market=market,
        timeframe=timeframe,
        signal_type=analysis["signal_type"],
        confidence=analysis["confidence"],
        entry_price=analysis["suggested_entry"],
        stop_loss=analysis["suggested_stop_loss"],
        take_profit=analysis["suggested_take_profit"],
        risk_reward_ratio=analysis["risk_reward_ratio"],
        support_zone=json.dumps(analysis["support_zone"]),
        resistance_zone=json.dumps(analysis["resistance_zone"]),
        rationale=analysis["rationale"],
        indicators_json=json.dumps(analysis["indicators"])
    )
    db.add(record)
    await db.commit()

    return analysis

@router.get("/signals")
async def get_recent_signals(
    symbol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DojiSignalRecord)
    if symbol:
        stmt = stmt.where(DojiSignalRecord.symbol == symbol)
    stmt = stmt.order_by(desc(DojiSignalRecord.created_at)).limit(10)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return records
