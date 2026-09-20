import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.models import User, Position, Order, TradeHistory, Portfolio
from app.schemas.schemas import OrderCreate, OrderResponse, PositionResponse, TradeHistoryResponse
from app.api.auth import get_current_user
from app.services.trading_engine import trading_engine
from app.services.market_data_service import market_data_service
from app.core.config import settings

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/place")
async def place_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if order_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if order_in.market not in settings.MARKETS:
        raise HTTPException(status_code=400, detail=f"Invalid market: {order_in.market}")

    success, message, position, pending = await trading_engine.execute_order(
        db=db,
        user_id=current_user.id,
        market=order_in.market,
        symbol=order_in.symbol,
        side=order_in.side,
        order_type=order_in.order_type,
        quantity=order_in.quantity,
        price=order_in.price,
        requested_price=order_in.requested_price,
        leverage=order_in.leverage,
        stop_loss=order_in.stop_loss,
        take_profit=order_in.take_profit
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    exec_price = position.entry_price if position else (pending.price if pending else None)
    slip = position.slippage if position else (pending.slippage if pending else None)
    req_price = position.requested_price if position else (pending.requested_price if pending else None)

    return {
        "success": True,
        "message": message,
        "executed_price": exec_price,
        "requested_price": req_price,
        "slippage": slip,
        "position": PositionResponse.model_validate(position) if position else None,
        "order": OrderResponse.model_validate(pending) if pending else None
    }

@router.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    market: str = Query(..., description="nse, forex, commodities, crypto"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Position)
        .where(Position.user_id == current_user.id, Position.market == market, Position.status == "open")
        .order_by(desc(Position.opened_at))
    )
    res = await db.execute(stmt)
    positions = res.scalars().all()

    # Update latest mark price and unrealized PnL dynamically from live cache
    results = []
    for pos in positions:
        live_tick = market_data_service.get_live_tick(pos.symbol)
        if live_tick:
            mark_price = live_tick["price"]
        else:
            quote = await market_data_service.get_latest_quote(pos.symbol)
            mark_price = quote["price"]

        pos.current_price = mark_price
        pnl, pnl_pct = trading_engine.calculate_pnl(pos.side, pos.entry_price, pos.current_price, pos.quantity)
        pos.unrealized_pnl = pnl
        
        pos_dict = PositionResponse.model_validate(pos).model_dump()
        pos_dict["unrealized_pnl_pct"] = round(pnl_pct * pos.leverage, 2)
        results.append(pos_dict)

    await db.commit()
    return results

@router.post("/close/{position_id}")
async def close_position(
    position_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success, message, trade = await trading_engine.close_position(
        db=db,
        position_id=position_id,
        user_id=current_user.id,
        close_reason="manual"
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "trade": TradeHistoryResponse.model_validate(trade) if trade else None
    }

@router.get("/pending", response_model=List[OrderResponse])
async def get_pending_orders(
    market: str = Query(..., description="nse, forex, commodities, crypto"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .where(Order.user_id == current_user.id, Order.market == market, Order.status == "pending")
        .order_by(desc(Order.created_at))
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()
    return [OrderResponse.model_validate(o) for o in orders]

@router.post("/cancel/{order_id}")
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Order).where(Order.id == order_id, Order.user_id == current_user.id, Order.status == "pending")
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pending order not found")

    order.status = "cancelled"
    await db.commit()
    return {"success": True, "message": "Order cancelled successfully"}

@router.get("/history", response_model=List[TradeHistoryResponse])
async def get_trade_history(
    market: str = Query(..., description="nse, forex, commodities, crypto"),
    symbol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(TradeHistory).where(TradeHistory.user_id == current_user.id, TradeHistory.market == market)
    if symbol:
        query = query.where(TradeHistory.symbol == symbol)
    query = query.order_by(desc(TradeHistory.closed_at))

    res = await db.execute(query)
    trades = res.scalars().all()
    return [TradeHistoryResponse.model_validate(t) for t in trades]

@router.get("/export-csv")
async def export_trade_history_csv(
    market: str = Query(..., description="nse, forex, commodities, crypto"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(TradeHistory)
        .where(TradeHistory.user_id == current_user.id, TradeHistory.market == market)
        .order_by(desc(TradeHistory.closed_at))
    )
    res = await db.execute(stmt)
    trades = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Trade ID", "Symbol", "Market", "Side", "Quantity", "Entry Price",
        "Exit Price", "Leverage", "Realized PnL", "Return %", "Holding (sec)",
        "Close Reason", "Opened At", "Closed At"
    ])

    for t in trades:
        writer.writerow([
            t.id, t.symbol, t.market, t.side.upper(), t.quantity, t.entry_price,
            t.exit_price, f"{t.leverage}x", t.realized_pnl, f"{t.return_pct:.2f}%",
            t.holding_seconds, t.close_reason, t.opened_at.isoformat(), t.closed_at.isoformat()
        ])

    csv_data = output.getvalue()
    filename = f"tradesense_{market}_journal_{current_user.username}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
