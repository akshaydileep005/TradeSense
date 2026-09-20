from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.models import User, PriceAlert
from app.schemas.schemas import PriceAlertCreate, PriceAlertResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[PriceAlertResponse])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PriceAlert).where(PriceAlert.user_id == current_user.id).order_by(desc(PriceAlert.created_at))
    res = await db.execute(stmt)
    alerts = res.scalars().all()
    return [PriceAlertResponse.model_validate(a) for a in alerts]

@router.post("", response_model=PriceAlertResponse)
async def create_alert(
    alert_in: PriceAlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_alert = PriceAlert(
        user_id=current_user.id,
        symbol=alert_in.symbol,
        market=alert_in.market,
        target_price=alert_in.target_price,
        condition=alert_in.condition.lower()
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return PriceAlertResponse.model_validate(new_alert)

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return {"success": True, "message": "Alert deleted"}
