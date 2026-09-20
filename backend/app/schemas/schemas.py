from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# User schemas
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Portfolio schemas
class PortfolioResponse(BaseModel):
    id: str
    market: str
    balance: float
    initial_balance: float
    currency: str
    last_recharge_at: Optional[datetime] = None
    equity: float = 0.0
    margin_used: float = 0.0
    free_margin: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    win_rate: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    largest_win: float = 0.0
    largest_loss: float = 0.0

    class Config:
        from_attributes = True

class CombinedNetWorthResponse(BaseModel):
    total_inr: float
    total_usd: float
    portfolios: Dict[str, PortfolioResponse]

# Trading & Orders schemas
class OrderCreate(BaseModel):
    market: str
    symbol: str
    side: str  # 'buy' or 'sell'
    order_type: str  # 'market' or 'limit'
    quantity: float
    price: Optional[float] = None
    requested_price: Optional[float] = None  # Live price on user's terminal when clicking Confirm
    leverage: int = 1
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class OrderResponse(BaseModel):
    id: str
    portfolio_id: str
    symbol: str
    market: str
    side: str
    order_type: str
    price: float
    requested_price: Optional[float] = None
    executed_price: Optional[float] = None
    slippage: Optional[float] = None
    slippage_pct: Optional[float] = None
    quantity: float
    leverage: int
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    status: str
    created_at: datetime
    filled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PositionResponse(BaseModel):
    id: str
    portfolio_id: str
    symbol: str
    market: str
    side: str
    quantity: float
    entry_price: float
    current_price: float
    leverage: int
    margin_used: float
    liquidation_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    unrealized_pnl: float
    unrealized_pnl_pct: float = 0.0
    requested_price: Optional[float] = None
    slippage: Optional[float] = None
    status: str
    opened_at: datetime

    class Config:
        from_attributes = True

class TradeHistoryResponse(BaseModel):
    id: str
    symbol: str
    market: str
    side: str
    quantity: float
    entry_price: float
    exit_price: float
    leverage: int
    realized_pnl: float
    return_pct: float
    holding_seconds: int
    close_reason: str
    opened_at: datetime
    closed_at: datetime

    class Config:
        from_attributes = True

# Market Data schemas
class Candle(BaseModel):
    time: int  # unix timestamp in seconds
    open: float
    high: float
    low: float
    close: float
    volume: float

class SymbolQuote(BaseModel):
    symbol: str
    name: str
    market: str
    price: float
    change: float
    change_pct: float
    high: float
    low: float
    volume: float
    currency: str
    timestamp: int

class NewsItem(BaseModel):
    id: str
    headline: str
    source: str
    timestamp: str
    url: str
    summary: str
    thumbnail: Optional[str] = None
    related_symbols: List[str] = []

# Doji AI schemas
class IndicatorBreakdown(BaseModel):
    rsi: float
    rsi_status: str
    macd_histogram: float
    macd_signal: str
    ema_trend: str
    bollinger_position: str
    atr: float

class DojiAnalysisResponse(BaseModel):
    symbol: str
    market: str
    timeframe: str
    signal_type: str  # 'bullish', 'bearish', 'neutral'
    confidence: int  # 0 to 100
    current_price: float
    suggested_entry: float
    suggested_stop_loss: float
    suggested_take_profit: float
    risk_reward_ratio: float
    support_zone: List[float]  # [lower, upper]
    resistance_zone: List[float]  # [lower, upper]
    rationale: str
    indicators: IndicatorBreakdown
    created_at: datetime

# Price Alert schemas
class PriceAlertCreate(BaseModel):
    symbol: str
    market: str
    target_price: float
    condition: str  # 'above' or 'below'

class PriceAlertResponse(BaseModel):
    id: str
    symbol: str
    market: str
    target_price: float
    condition: str
    triggered: bool
    triggered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Leaderboard schemas
class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    avatar_url: Optional[str] = None
    total_pnl_pct: float
    win_rate: float
    total_trades: int
    favorite_market: str
