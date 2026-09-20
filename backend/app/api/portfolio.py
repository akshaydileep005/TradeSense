from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import PortfolioResponse, CombinedNetWorthResponse
from app.api.auth import get_current_user
from app.services.portfolio_service import portfolio_service
from app.core.config import settings

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/stats/{market}", response_model=PortfolioResponse)
async def get_market_portfolio(
    market: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if market not in settings.MARKETS:
        raise HTTPException(status_code=400, detail=f"Invalid market: {market}")
    stats = await portfolio_service.get_portfolio_stats(db, current_user.id, market)
    return stats

@router.get("/net-worth", response_model=CombinedNetWorthResponse)
async def get_net_worth(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = await portfolio_service.get_combined_net_worth(db, current_user.id)
    return data

@router.post("/recharge/{market}")
async def recharge(
    market: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if market not in settings.MARKETS:
        raise HTTPException(status_code=400, detail=f"Invalid market: {market}")
    success, message, new_balance = await portfolio_service.recharge_balance(db, current_user.id, market)
    if not success:
        raise HTTPException(status_code=429, detail=message)
    return {"success": True, "message": message, "balance": new_balance}
