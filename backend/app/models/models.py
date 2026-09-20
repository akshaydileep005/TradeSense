import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    market = Column(String(30), nullable=False)  # 'nse', 'forex', 'commodities', 'crypto'
    balance = Column(Float, nullable=False)
    initial_balance = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)  # '₹' or '$'
    last_recharge_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="portfolios")
    positions = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="portfolio", cascade="all, delete-orphan")
    trades = relationship("TradeHistory", back_populates="portfolio", cascade="all, delete-orphan")

class Position(Base):
    __tablename__ = "positions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    portfolio_id = Column(String(36), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=False)
    symbol = Column(String(50), nullable=False)
    market = Column(String(30), nullable=False)
    side = Column(String(10), nullable=False)  # 'buy' (long) or 'sell' (short)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    leverage = Column(Integer, default=1)
    margin_used = Column(Float, nullable=False)
    liquidation_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, default=0.0)
    requested_price = Column(Float, nullable=True)
    slippage = Column(Float, nullable=True)
    status = Column(String(20), default="open")  # 'open', 'closed'
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)

    portfolio = relationship("Portfolio", back_populates="positions")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    portfolio_id = Column(String(36), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=False)
    symbol = Column(String(50), nullable=False)
    market = Column(String(30), nullable=False)
    side = Column(String(10), nullable=False)  # 'buy' or 'sell'
    order_type = Column(String(20), nullable=False)  # 'market' or 'limit'
    price = Column(Float, nullable=False)  # Target or fill price
    requested_price = Column(Float, nullable=True)
    executed_price = Column(Float, nullable=True)
    slippage = Column(Float, nullable=True)
    quantity = Column(Float, nullable=False)
    leverage = Column(Integer, default=1)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    status = Column(String(20), default="pending")  # 'pending', 'filled', 'cancelled'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    filled_at = Column(DateTime, nullable=True)

    portfolio = relationship("Portfolio", back_populates="orders")

class TradeHistory(Base):
    __tablename__ = "trade_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    portfolio_id = Column(String(36), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=False)
    symbol = Column(String(50), nullable=False)
    market = Column(String(30), nullable=False)
    side = Column(String(10), nullable=False)  # 'buy' or 'sell'
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    leverage = Column(Integer, default=1)
    realized_pnl = Column(Float, nullable=False)
    return_pct = Column(Float, nullable=False)
    holding_seconds = Column(Integer, default=0)
    close_reason = Column(String(30), default="manual")  # 'manual', 'take_profit', 'stop_loss', 'liquidation'
    opened_at = Column(DateTime, nullable=False)
    closed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    portfolio = relationship("Portfolio", back_populates="trades")

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(50), nullable=False)
    market = Column(String(30), nullable=False)
    target_price = Column(Float, nullable=False)
    condition = Column(String(10), nullable=False)  # 'above' or 'below'
    triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alerts")

class DojiSignalRecord(Base):
    __tablename__ = "doji_signals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    symbol = Column(String(50), nullable=False)
    market = Column(String(30), nullable=False)
    timeframe = Column(String(10), nullable=False)
    signal_type = Column(String(20), nullable=False)  # 'bullish', 'bearish', 'neutral'
    confidence = Column(Integer, nullable=False)  # 0 to 100
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=False)
    risk_reward_ratio = Column(Float, nullable=False)
    support_zone = Column(String(100), nullable=True)
    resistance_zone = Column(String(100), nullable=True)
    rationale = Column(Text, nullable=False)
    indicators_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
