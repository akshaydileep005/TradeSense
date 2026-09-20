import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.models import Portfolio, Position, Order, TradeHistory, PriceAlert
from app.core.config import settings
from app.services.market_data_service import market_data_service

class TradingEngine:
    def calculate_margin(self, price: float, quantity: float, leverage: int) -> float:
        """Calculate margin required for a trade."""
        if leverage < 1:
            leverage = 1
        notional = price * quantity
        return round(notional / leverage, 2)

    def calculate_liquidation_price(self, side: str, entry_price: float, leverage: int, market: str) -> float:
        """Calculate exact liquidation price considering maintenance margin."""
        m_cfg = settings.MARKETS.get(market)
        mm_pct = m_cfg.maintenance_margin_pct if m_cfg else 0.05
        
        if side.lower() == "buy":
            # Long: liquidation occurs when price drops enough that equity <= maintenance margin
            liq = entry_price * (1.0 - (1.0 / leverage) + mm_pct)
            return max(round(liq, 4 if market == "forex" else 2), 0.0)
        else:
            # Short: liquidation occurs when price rises enough that equity <= maintenance margin
            liq = entry_price * (1.0 + (1.0 / leverage) - mm_pct)
            return max(round(liq, 4 if market == "forex" else 2), 0.0)

    def calculate_pnl(self, side: str, entry_price: float, current_price: float, quantity: float) -> Tuple[float, float]:
        """Calculate absolute P&L and percentage return on notional."""
        if side.lower() == "buy":
            pnl = (current_price - entry_price) * quantity
            pnl_pct = ((current_price - entry_price) / entry_price * 100) if entry_price > 0 else 0.0
        else:
            pnl = (entry_price - current_price) * quantity
            pnl_pct = ((entry_price - current_price) / entry_price * 100) if entry_price > 0 else 0.0
        
        return round(pnl, 2), round(pnl_pct, 2)

    async def execute_order(
        self,
        db: AsyncSession,
        user_id: str,
        market: str,
        symbol: str,
        side: str,
        order_type: str,
        quantity: float,
        price: Optional[float] = None,
        requested_price: Optional[float] = None,
        leverage: int = 1,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Tuple[bool, str, Optional[Position], Optional[Order]]:
        """Process and execute or pend an order with live cache price & stale protection."""
        # 1. Fetch user portfolio for this market
        stmt = select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.market == market)
        res = await db.execute(stmt)
        portfolio = res.scalar_one_or_none()
        if not portfolio:
            return False, f"Portfolio for {market} not found", None, None

        now_ts = time.time()
        slippage = None
        slippage_pct = None

        # 2. Price Determination & Stale Price Protection
        if order_type.lower() == "market":
            # Strict requirement: Read price from live in-memory price cache, not REST snapshot
            live_tick = market_data_service.get_live_tick(symbol)
            if not live_tick:
                await market_data_service.get_latest_quote(symbol)
                live_tick = market_data_service.get_live_tick(symbol)

            if not live_tick:
                return False, f"Live market price unavailable for {symbol}. Order rejected.", None, None

            price_timestamp = live_tick.get("timestamp", 0)
            price_age = now_ts - price_timestamp

            # Stale Price Check: reject if > 2.0 seconds
            if price_age > 2.0:
                print(f"[STALE PRICE REJECTED] {symbol} price age: {price_age:.3f}s > 2.0s threshold.")
                return False, f"Order execution rejected: Stale market price ({price_age:.2f}s old exceeds 2.0s limit). Stale price protection active. Please retry.", None, None

            exec_price = float(live_tick["price"])
            req_price = requested_price if (requested_price is not None and requested_price > 0) else exec_price

            # Calculate slippage
            decimals = 4 if market == "forex" else 2
            slippage = round(exec_price - req_price, decimals)
            slippage_pct = round((slippage / req_price) * 100, 3) if req_price > 0 else 0.0

            # Log execution details for audit & debugging
            print(f"[ORDER EXECUTION] {market.upper()} {symbol} {side.upper()} | Req: {req_price} | Exec: {exec_price} | Slippage: {slippage:+} ({slippage_pct:+}%) | Price Age: {price_age:.3f}s")
        else:
            # Limit order
            exec_price = price or 0.0
            if exec_price <= 0:
                live_tick = market_data_service.get_live_tick(symbol)
                exec_price = live_tick["price"] if live_tick else 0.0
            req_price = exec_price

        # Validate leverage
        m_cfg = settings.MARKETS.get(market)
        max_lev = m_cfg.max_leverage if m_cfg else 20
        if leverage > max_lev:
            leverage = max_lev
        if leverage < 1:
            leverage = 1

        # 3. Calculate required margin
        margin_required = self.calculate_margin(exec_price, quantity, leverage)
        
        # Check active used margin across all open positions
        pos_stmt = select(Position).where(Position.portfolio_id == portfolio.id, Position.status == "open")
        pos_res = await db.execute(pos_stmt)
        open_positions = pos_res.scalars().all()
        
        total_margin_used = sum(p.margin_used for p in open_positions)
        total_unrealized_pnl = sum(p.unrealized_pnl for p in open_positions)
        current_equity = portfolio.balance + total_unrealized_pnl
        free_margin = current_equity - total_margin_used

        if margin_required > free_margin:
            return False, f"Insufficient free margin. Required: {portfolio.currency}{margin_required:,.2f}, Available: {portfolio.currency}{max(free_margin, 0):,.2f}", None, None

        # 4. Handle Market Order -> Instant Fill
        if order_type.lower() == "market":
            liq_price = self.calculate_liquidation_price(side, exec_price, leverage, market)
            
            # Deduct margin from cash balance (or lock it)
            portfolio.balance -= margin_required

            new_position = Position(
                portfolio_id=portfolio.id,
                user_id=user_id,
                symbol=symbol,
                market=market,
                side=side.lower(),
                quantity=quantity,
                entry_price=exec_price,
                current_price=exec_price,
                leverage=leverage,
                margin_used=margin_required,
                liquidation_price=liq_price,
                stop_loss=stop_loss,
                take_profit=take_profit,
                unrealized_pnl=0.0,
                requested_price=req_price,
                slippage=slippage,
                status="open",
                opened_at=datetime.now(timezone.utc)
            )
            db.add(new_position)

            order_record = Order(
                portfolio_id=portfolio.id,
                user_id=user_id,
                symbol=symbol,
                market=market,
                side=side.lower(),
                order_type="market",
                price=exec_price,
                requested_price=req_price,
                executed_price=exec_price,
                slippage=slippage,
                quantity=quantity,
                leverage=leverage,
                stop_loss=stop_loss,
                take_profit=take_profit,
                status="filled",
                filled_at=datetime.now(timezone.utc)
            )
            db.add(order_record)
            await db.commit()
            await db.refresh(new_position)
            return True, "Market order executed successfully", new_position, order_record

        # 5. Handle Limit Order -> Pending
        else:
            pending_order = Order(
                portfolio_id=portfolio.id,
                user_id=user_id,
                symbol=symbol,
                market=market,
                side=side.lower(),
                order_type="limit",
                price=exec_price,
                requested_price=req_price,
                executed_price=None,
                slippage=None,
                quantity=quantity,
                leverage=leverage,
                stop_loss=stop_loss,
                take_profit=take_profit,
                status="pending",
                created_at=datetime.now(timezone.utc)
            )
            db.add(pending_order)
            await db.commit()
            await db.refresh(pending_order)
            return True, "Limit order placed successfully and awaiting fill", None, pending_order

    async def close_position(
        self,
        db: AsyncSession,
        position_id: str,
        user_id: str,
        close_reason: str = "manual",
        custom_exit_price: Optional[float] = None
    ) -> Tuple[bool, str, Optional[TradeHistory]]:
        """Close an active position, update portfolio balance, and log to TradeHistory."""
        stmt = select(Position).where(Position.id == position_id, Position.user_id == user_id, Position.status == "open")
        res = await db.execute(stmt)
        position = res.scalar_one_or_none()
        if not position:
            return False, "Position not found or already closed", None

        # Determine exit price
        if custom_exit_price:
            exit_price = custom_exit_price
        else:
            quote = await market_data_service.get_latest_quote(position.symbol)
            exit_price = quote["price"]

        pnl, pnl_pct = self.calculate_pnl(position.side, position.entry_price, exit_price, position.quantity)
        
        # Fetch portfolio
        p_stmt = select(Portfolio).where(Portfolio.id == position.portfolio_id)
        p_res = await db.execute(p_stmt)
        portfolio = p_res.scalar_one()

        # Release margin and add realized PnL back into balance
        portfolio.balance += (position.margin_used + pnl)

        now = datetime.now(timezone.utc)
        holding_sec = int((now - position.opened_at.replace(tzinfo=timezone.utc if position.opened_at.tzinfo is None else None)).total_seconds())

        trade = TradeHistory(
            portfolio_id=portfolio.id,
            user_id=user_id,
            symbol=position.symbol,
            market=position.market,
            side=position.side,
            quantity=position.quantity,
            entry_price=position.entry_price,
            exit_price=exit_price,
            leverage=position.leverage,
            realized_pnl=pnl,
            return_pct=pnl_pct * position.leverage,
            holding_seconds=max(holding_sec, 1),
            close_reason=close_reason,
            opened_at=position.opened_at,
            closed_at=now
        )
        db.add(trade)

        position.status = "closed"
        position.closed_at = now
        position.unrealized_pnl = 0.0

        await db.commit()
        await db.refresh(trade)
        return True, f"Position closed. Realized P&L: {portfolio.currency}{pnl:+,.2f}", trade

    async def update_open_positions_and_check_triggers(self, db: AsyncSession, symbol: str, current_price: float) -> List[str]:
        """Update live P&L and automatically trigger SL, TP, or Liquidation."""
        events = []
        stmt = select(Position).where(Position.symbol == symbol, Position.status == "open")
        res = await db.execute(stmt)
        positions = res.scalars().all()

        for pos in positions:
            pos.current_price = current_price
            pnl, _ = self.calculate_pnl(pos.side, pos.entry_price, current_price, pos.quantity)
            pos.unrealized_pnl = pnl

            # 1. Check Liquidation
            if pos.liquidation_price:
                is_liquidated = (
                    (pos.side == "buy" and current_price <= pos.liquidation_price) or
                    (pos.side == "sell" and current_price >= pos.liquidation_price)
                )
                if is_liquidated:
                    await self.close_position(db, pos.id, pos.user_id, close_reason="liquidation", custom_exit_price=pos.liquidation_price)
                    events.append(f"Position on {pos.symbol} was LIQUIDATED at {current_price}")
                    continue

            # 2. Check Stop Loss
            if pos.stop_loss:
                is_sl_hit = (
                    (pos.side == "buy" and current_price <= pos.stop_loss) or
                    (pos.side == "sell" and current_price >= pos.stop_loss)
                )
                if is_sl_hit:
                    await self.close_position(db, pos.id, pos.user_id, close_reason="stop_loss", custom_exit_price=pos.stop_loss)
                    events.append(f"Stop Loss triggered for {pos.symbol} at {pos.stop_loss}")
                    continue

            # 3. Check Take Profit
            if pos.take_profit:
                is_tp_hit = (
                    (pos.side == "buy" and current_price >= pos.take_profit) or
                    (pos.side == "sell" and current_price <= pos.take_profit)
                )
                if is_tp_hit:
                    await self.close_position(db, pos.id, pos.user_id, close_reason="take_profit", custom_exit_price=pos.take_profit)
                    events.append(f"Take Profit hit for {pos.symbol} at {pos.take_profit}")
                    continue

        # Check pending Limit Orders for this symbol
        ord_stmt = select(Order).where(Order.symbol == symbol, Order.status == "pending")
        ord_res = await db.execute(ord_stmt)
        pending_orders = ord_res.scalars().all()

        for order in pending_orders:
            should_fill = (
                (order.side == "buy" and current_price <= order.price) or
                (order.side == "sell" and current_price >= order.price)
            )
            if should_fill:
                # Fill limit order using live tick price
                success, msg, pos, filled_record = await self.execute_order(
                    db,
                    user_id=order.user_id,
                    market=order.market,
                    symbol=order.symbol,
                    side=order.side,
                    order_type="market",
                    quantity=order.quantity,
                    price=current_price,
                    requested_price=order.price,
                    leverage=order.leverage,
                    stop_loss=order.stop_loss,
                    take_profit=order.take_profit
                )
                if success:
                    order.status = "filled"
                    order.filled_at = datetime.now(timezone.utc)
                    order.executed_price = pos.entry_price if pos else current_price
                    decimals = 4 if order.market == "forex" else 2
                    order.slippage = round(order.executed_price - order.price, decimals)
                    events.append(f"Limit order for {order.symbol} FILLED at {order.executed_price}")

        # Check Price Alerts
        alert_stmt = select(PriceAlert).where(PriceAlert.symbol == symbol, PriceAlert.triggered == False)
        alert_res = await db.execute(alert_stmt)
        alerts = alert_res.scalars().all()
        for alert in alerts:
            is_triggered = (
                (alert.condition == "above" and current_price >= alert.target_price) or
                (alert.condition == "below" and current_price <= alert.target_price)
            )
            if is_triggered:
                alert.triggered = True
                alert.triggered_at = datetime.now(timezone.utc)
                events.append(f"Price alert triggered: {alert.symbol} is now {alert.condition} {alert.target_price}")

        await db.commit()
        return events

trading_engine = TradingEngine()
