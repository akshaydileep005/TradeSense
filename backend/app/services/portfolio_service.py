from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import Portfolio, Position, TradeHistory
from app.core.config import settings

class PortfolioService:
    async def get_or_create_portfolios(self, db: AsyncSession, user_id: str) -> Dict[str, Portfolio]:
        """Ensure user has an isolated portfolio for every configured market."""
        stmt = select(Portfolio).where(Portfolio.user_id == user_id)
        res = await db.execute(stmt)
        portfolios = {p.market: p for p in res.scalars().all()}

        created_any = False
        for market_key, market_cfg in settings.MARKETS.items():
            if market_key not in portfolios:
                new_port = Portfolio(
                    user_id=user_id,
                    market=market_key,
                    balance=market_cfg.initial_balance,
                    initial_balance=market_cfg.initial_balance,
                    currency=market_cfg.currency,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_port)
                portfolios[market_key] = new_port
                created_any = True

        if created_any:
            await db.commit()
            for p in portfolios.values():
                await db.refresh(p)

        return portfolios

    async def get_portfolio_stats(self, db: AsyncSession, user_id: str, market: str) -> dict:
        """Calculate comprehensive portfolio metrics."""
        portfolios = await self.get_or_create_portfolios(db, user_id)
        portfolio = portfolios.get(market)
        if not portfolio:
            return {}

        # 1. Fetch Open Positions
        pos_stmt = select(Position).where(Position.portfolio_id == portfolio.id, Position.status == "open")
        pos_res = await db.execute(pos_stmt)
        open_positions = pos_res.scalars().all()

        margin_used = sum(p.margin_used for p in open_positions)
        unrealized_pnl = sum(p.unrealized_pnl for p in open_positions)
        equity = portfolio.balance + margin_used + unrealized_pnl
        free_margin = max(equity - margin_used, 0.0)

        # 2. Fetch Closed Trades
        trade_stmt = select(TradeHistory).where(TradeHistory.portfolio_id == portfolio.id)
        trade_res = await db.execute(trade_stmt)
        trades = trade_res.scalars().all()

        total_trades = len(trades)
        winning_trades = sum(1 for t in trades if t.realized_pnl > 0)
        losing_trades = sum(1 for t in trades if t.realized_pnl < 0)
        win_rate = round((winning_trades / total_trades * 100), 1) if total_trades > 0 else 0.0
        realized_pnl = sum(t.realized_pnl for t in trades)

        pnls = [t.realized_pnl for t in trades]
        largest_win = max([p for p in pnls if p > 0], default=0.0)
        largest_loss = min([p for p in pnls if p < 0], default=0.0)

        return {
            "id": portfolio.id,
            "market": portfolio.market,
            "balance": round(portfolio.balance, 2),
            "initial_balance": portfolio.initial_balance,
            "currency": portfolio.currency,
            "last_recharge_at": portfolio.last_recharge_at,
            "equity": round(equity, 2),
            "margin_used": round(margin_used, 2),
            "free_margin": round(free_margin, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "realized_pnl": round(realized_pnl, 2),
            "win_rate": win_rate,
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "largest_win": round(largest_win, 2),
            "largest_loss": round(largest_loss, 2)
        }

    async def get_combined_net_worth(self, db: AsyncSession, user_id: str) -> dict:
        """Aggregate total portfolio value across all four segments."""
        portfolios = await self.get_or_create_portfolios(db, user_id)
        stats = {}
        total_inr = 0.0
        total_usd = 0.0
        usd_to_inr = 84.0  # reference conversion for aggregation

        for m_key in settings.MARKETS.keys():
            m_stat = await self.get_portfolio_stats(db, user_id, m_key)
            stats[m_key] = m_stat
            if m_stat["currency"] == "₹":
                total_inr += m_stat["equity"]
            else:
                total_usd += m_stat["equity"]

        # Combined INR & Combined USD equivalent
        combined_inr = total_inr + (total_usd * usd_to_inr)
        combined_usd = total_usd + (total_inr / usd_to_inr)

        return {
            "total_inr": round(combined_inr, 2),
            "total_usd": round(combined_usd, 2),
            "portfolios": stats
        }

    async def recharge_balance(self, db: AsyncSession, user_id: str, market: str) -> Tuple[bool, str, float]:
        """Recharge or reset virtual dummy funds with cooldown protection."""
        portfolios = await self.get_or_create_portfolios(db, user_id)
        portfolio = portfolios.get(market)
        if not portfolio:
            return False, "Portfolio not found", 0.0

        now = datetime.now(timezone.utc)
        if portfolio.last_recharge_at:
            cooldown_seconds = 60  # 1 minute cooldown
            elapsed = (now - portfolio.last_recharge_at.replace(tzinfo=timezone.utc if portfolio.last_recharge_at.tzinfo is None else None)).total_seconds()
            if elapsed < cooldown_seconds:
                remaining = int(cooldown_seconds - elapsed)
                return False, f"Recharge cooldown active. Please wait {remaining} seconds.", portfolio.balance

        # Reset balance back to initial allocation
        portfolio.balance = portfolio.initial_balance
        portfolio.last_recharge_at = now
        await db.commit()
        await db.refresh(portfolio)

        return True, f"Virtual balance successfully restored to {portfolio.currency}{portfolio.initial_balance:,.2f}!", portfolio.balance

portfolio_service = PortfolioService()
