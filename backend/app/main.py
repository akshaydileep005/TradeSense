import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import User
from app.services.portfolio_service import portfolio_service
from app.api import auth, portfolio, market, orders, doji, alerts, leaderboard, ws
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed Demo Trader account
    async with AsyncSessionLocal() as db:
        demo_email = "demo@tradesense.app"
        stmt = select(User).where(User.email == demo_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            demo_user = User(
                email=demo_email,
                username="AlphaTrader",
                hashed_password=get_password_hash("DemoTraderPass2026!"),
                avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=AlphaTrader"
            )
            db.add(demo_user)
            await db.commit()
            await db.refresh(demo_user)
            await portfolio_service.get_or_create_portfolios(db, demo_user.id)

    # Warm price cache and start ticker service
    from app.services.market_data_service import market_data_service
    await market_data_service.warm_price_cache()
    ticker_task = ws.manager.start_background_ticker()

    yield
    # Shutdown
    if ticker_task:
        ticker_task.cancel()
        try:
            await ticker_task
        except (asyncio.CancelledError, Exception):
            pass
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TradeSense — AI-Assisted Paper Trading Simulator API",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(portfolio.router, prefix=settings.API_V1_STR)
app.include_router(market.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(doji.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(leaderboard.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)

@app.get("/")
async def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "markets": list(settings.MARKETS.keys())
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "markets": list(settings.MARKETS.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
