from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from sqlalchemy.orm import Session

from database import SessionLocal
from security import decode_access_token
from schemas import TokenData
from crud import get_customer_by_email
from models import Customer


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/public/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Customer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(
            email=email,
            customer_id=payload.get("customer_id"),
            is_admin=payload.get("is_admin"),
        )
    except JWTError:
        raise credentials_exception

    user = get_customer_by_email(db, token_data.email)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_admin_user(
    current_user: Customer = Depends(get_current_user),
) -> Customer:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user
