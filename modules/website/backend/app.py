import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import Base, engine
from models import CustomerType
from schemas import (
    RegistrationRequest,
    RegistrationResponse,
    PasswordSetupTokenInfo,
    PasswordSetupRequest,
    PasswordSetupResponse,
    Token,
    LoginRequest,
    CustomersListResponse,
    CustomerListItem,
    CustomerDetail,
)
from security import verify_password, get_password_hash, create_access_token
from deps import get_db, get_current_admin_user
from crud import (
    get_customer_by_email,
    create_customer,
    create_registration_token,
    get_registration_token,
    mark_registration_token_used,
    list_customers,
    get_customer,
)
from initial_data import init_db

logger = logging.getLogger("website-backend")

app = FastAPI(title="Casuse Website Backend", version="1.0.0")

# CORS
origins = [
    origin.strip()
    for origin in settings.WEBSITE_CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # geen cookies nu, maar laten staan voor admin UI
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    init_db()
    logger.info("Website backend started, DB initialized.")


@app.get("/health")
def health():
    return {"status": "ok"}


# === PUBLIC REGISTRATION ===


@app.post(
    "/api/public/register",
    status_code=status.HTTP_201_CREATED,
)
def public_register(
    registration: RegistrationRequest,
    db: Session = Depends(get_db),
):
    existing = get_customer_by_email(db, registration.email)
    if existing:
        # Frontend verwacht: { "detail": "Email already registered" }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Klant + token aanmaken (dit werkte al, gezien je admin-lijst)
    customer = create_customer(db, registration=registration, hashed_password=None)
    token = create_registration_token(db, customer)

    # Password-setup link loggen (voor e-mail)
    try:
        base_url = settings.WEBSITE_PUBLIC_BASE_URL.rstrip("/")
        url = f"{base_url}/password-setup?token={token.token}"
        logger.info(
            "Password setup email stub for %s: %s",
            customer.email,
            url,
        )
    except Exception as e:
        # Als hier ooit iets misgaat, niet de hele registratie laten falen
        logger.exception("Failed to build password setup URL: %s", e)

    # Heel eenvoudig, plain JSON. Geen Pydantic response_model meer nodig.
    return {
        "status": "ok",
        "message": "Registration received",
        "registration_id": str(customer.id),
    }


# === PUBLIC PASSWORD SETUP ===


@app.get(
    "/api/public/password-setup/{token}",
    response_model=PasswordSetupTokenInfo,
)
def password_setup_validate(
    token: str = Path(...),
    db: Session = Depends(get_db),
):
    token_obj = get_registration_token(db, token)
    if (
        not token_obj
        or token_obj.used
        or token_obj.expires_at < datetime.now(timezone.utc)
    ):
        # Frontend verwacht 400 + detail bij ongeldig token
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    return PasswordSetupTokenInfo(
        status="ok",
        email=token_obj.customer.email,
    )


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters.",
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter.",
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter.",
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one digit.",
        )


@app.post(
    "/api/public/password-setup/{token}",
    response_model=PasswordSetupResponse,
)
def password_setup_complete(
    token: str,
    req: PasswordSetupRequest,
    db: Session = Depends(get_db),
):
    if req.password != req.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    token_obj = get_registration_token(db, token)
    if (
        not token_obj
        or token_obj.used
        or token_obj.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    customer = token_obj.customer
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is not linked to a customer.",
        )

    _validate_password_strength(req.password)
    customer.hashed_password = get_password_hash(req.password)

    db.add(customer)
    mark_registration_token_used(db, token_obj)

    return PasswordSetupResponse(
        status="ok",
        message="Password set successfully",
    )


# === PUBLIC LOGIN (voor admin UI / later klantportaal) ===


@app.post("/api/public/login", response_model=Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = get_customer_by_email(db, login_data.email)
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is inactive",
        )

    access_token_expires = timedelta(
        minutes=settings.WEBSITE_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = create_access_token(
        data={
            "sub": user.email,
            "customer_id": str(user.id),
            "is_admin": user.is_admin,
        },
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token)


# === ADMIN ENDPOINTS ===


@app.get(
    "/api/admin/customers",
    response_model=CustomersListResponse,
)
def admin_list_customers(
    search: Optional[str] = Query(None),
    customer_type: Optional[CustomerType] = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    items, total = list_customers(
        db,
        search=search,
        customer_type=customer_type,
        skip=0,
        limit=100,
    )
    return CustomersListResponse(
        items=[CustomerListItem.from_orm(c) for c in items],
        total=total,
    )


@app.get(
    "/api/admin/customers/{customer_id}",
    response_model=CustomerDetail,
)
def admin_get_customer(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return CustomerDetail.from_orm(customer)
