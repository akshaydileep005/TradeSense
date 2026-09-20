import os
from pydantic import BaseModel
from typing import Dict, Any, List

class MarketConfig(BaseModel):
    name: str
    currency: str
    symbol_prefix: str
    initial_balance: float
    max_leverage: int
    default_leverage: int
    maintenance_margin_pct: float
    symbols: List[dict]

class Settings:
    PROJECT_NAME: str = "TradeSense"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tradesense_super_secret_jwt_key_2026_fintech_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tradesense.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    TWELVE_DATA_API_KEY: str = os.getenv("TWELVE_DATA_API_KEY", "")
    
    MARKETS: Dict[str, MarketConfig] = {
        "nse": MarketConfig(
            name="NSE (Indian Equities)",
            currency="₹",
            symbol_prefix="₹",
            initial_balance=1000000.0,  # ₹10,00,000
            max_leverage=5,
            default_leverage=1,
            maintenance_margin_pct=0.10,
            symbols=[
                {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "base": "RELIANCE", "type": "Equity", "sector": "Energy"},
                {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "base": "TCS", "type": "Equity", "sector": "IT"},
                {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "base": "HDFCBANK", "type": "Equity", "sector": "Banking"},
                {"symbol": "INFY.NS", "name": "Infosys Ltd", "base": "INFY", "type": "Equity", "sector": "IT"},
                {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "base": "ICICIBANK", "type": "Equity", "sector": "Banking"},
                {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd", "base": "TATAMOTORS", "type": "Equity", "sector": "Automobile"},
                {"symbol": "SBIN.NS", "name": "State Bank of India", "base": "SBIN", "type": "Equity", "sector": "Banking"},
                {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "base": "BHARTIARTL", "type": "Equity", "sector": "Telecom"},
                {"symbol": "ITC.NS", "name": "ITC Ltd", "base": "ITC", "type": "Equity", "sector": "FMCG"},
                {"symbol": "LT.NS", "name": "Larsen & Toubro", "base": "LT", "type": "Equity", "sector": "Engineering"},
                {"symbol": "^NSEI", "name": "NIFTY 50 Index", "base": "NIFTY50", "type": "Index", "sector": "Index"},
                {"symbol": "^NSEBANK", "name": "BANK NIFTY Index", "base": "BANKNIFTY", "type": "Index", "sector": "Index"},
            ]
        ),
        "forex": MarketConfig(
            name="Forex (Currency Pairs)",
            currency="$",
            symbol_prefix="$",
            initial_balance=200000.0,  # $200,000
            max_leverage=20,
            default_leverage=5,
            maintenance_margin_pct=0.03,
            symbols=[
                {"symbol": "EURUSD=X", "name": "EUR / USD", "base": "EURUSD", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "GBPUSD=X", "name": "GBP / USD", "base": "GBPUSD", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "USDJPY=X", "name": "USD / JPY", "base": "USDJPY", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "AUDUSD=X", "name": "AUD / USD", "base": "AUDUSD", "type": "Currency Pair", "sector": "Commodity Currency"},
                {"symbol": "USDCHF=X", "name": "USD / CHF", "base": "USDCHF", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "USDCAD=X", "name": "USD / CAD", "base": "USDCAD", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "NZDUSD=X", "name": "NZD / USD", "base": "NZDUSD", "type": "Currency Pair", "sector": "Major"},
                {"symbol": "EURGBP=X", "name": "EUR / GBP", "base": "EURGBP", "type": "Currency Pair", "sector": "Cross"},
            ]
        ),
        "commodities": MarketConfig(
            name="Commodities",
            currency="$",
            symbol_prefix="$",
            initial_balance=200000.0,  # $200,000
            max_leverage=10,
            default_leverage=2,
            maintenance_margin_pct=0.05,
            symbols=[
                {"symbol": "GC=F", "name": "Gold Futures", "base": "GOLD", "type": "Precious Metal", "sector": "Metals"},
                {"symbol": "SI=F", "name": "Silver Futures", "base": "SILVER", "type": "Precious Metal", "sector": "Metals"},
                {"symbol": "CL=F", "name": "Crude Oil WTI", "base": "CRUDE_OIL", "type": "Energy", "sector": "Energy"},
                {"symbol": "NG=F", "name": "Natural Gas", "base": "NAT_GAS", "type": "Energy", "sector": "Energy"},
                {"symbol": "HG=F", "name": "Copper Futures", "base": "COPPER", "type": "Industrial Metal", "sector": "Metals"},
                {"symbol": "PL=F", "name": "Platinum Futures", "base": "PLATINUM", "type": "Precious Metal", "sector": "Metals"},
            ]
        ),
        "crypto": MarketConfig(
            name="Crypto (Digital Assets)",
            currency="$",
            symbol_prefix="$",
            initial_balance=200000.0,  # $200,000
            max_leverage=20,
            default_leverage=3,
            maintenance_margin_pct=0.05,
            symbols=[
                {"symbol": "BTC-USD", "name": "Bitcoin / USD", "base": "BTC", "type": "Cryptocurrency", "sector": "Layer 1"},
                {"symbol": "ETH-USD", "name": "Ethereum / USD", "base": "ETH", "type": "Cryptocurrency", "sector": "Smart Contracts"},
                {"symbol": "SOL-USD", "name": "Solana / USD", "base": "SOL", "type": "Cryptocurrency", "sector": "Layer 1"},
                {"symbol": "BNB-USD", "name": "BNB / USD", "base": "BNB", "type": "Cryptocurrency", "sector": "Exchange"},
                {"symbol": "XRP-USD", "name": "XRP / USD", "base": "XRP", "type": "Cryptocurrency", "sector": "Payments"},
                {"symbol": "ADA-USD", "name": "Cardano / USD", "base": "ADA", "type": "Cryptocurrency", "sector": "Layer 1"},
                {"symbol": "DOGE-USD", "name": "Dogecoin / USD", "base": "DOGE", "type": "Cryptocurrency", "sector": "Meme/Payment"},
                {"symbol": "AVAX-USD", "name": "Avalanche / USD", "base": "AVAX", "type": "Cryptocurrency", "sector": "Layer 1"},
            ]
        )
    }

settings = Settings()
