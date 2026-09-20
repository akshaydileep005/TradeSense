from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    stmt = select(User).where((User.email == user_data.email) | (User.username == user_data.username))
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_pw,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_data.username}",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Initialize portfolios
    await portfolio_service.get_or_create_portfolios(db, new_user.id)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(new_user))

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where((User.email == login_data.email) | (User.username == login_data.email))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Ensure portfolios exist
    await portfolio_service.get_or_create_portfolios(db, user.id)

    token = create_access_token({"sub": user.id, "email": user.email})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/demo-login", response_model=Token)
async def demo_login(db: AsyncSession = Depends(get_db)):
    """Single-click instant demo login for reviewers and evaluation."""
    demo_email = "demo@tradesense.app"
    stmt = select(User).where(User.email == demo_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        hashed_pw = get_password_hash("DemoTraderPass2026!")
        user = User(
            email=demo_email,
            username="AlphaTrader",
            hashed_password=hashed_pw,
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=AlphaTrader",
            created_at=datetime.now(timezone.utc)
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Ensure all portfolios are created
    await portfolio_service.get_or_create_portfolios(db, user.id)

    token = create_access_token({"sub": user.id, "email": user.email})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
