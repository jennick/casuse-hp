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
    CustomerUpdate,
    SimpleSuccessResponse,
    PasswordResetResponse,
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
    update_customer,
    soft_delete_customer,
    mark_all_tokens_used_for_customer,
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

    # Klant + token aanmaken
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
        # Als hier iets misgaat, niet de hele registratie laten falen
        logger.exception("Failed to build password setup URL: %s", e)

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
    include_inactive: bool = Query(False),
    status_param: Optional[str] = Query(
        None,
        alias="status",
        regex="^(active|inactive|all)$",
    ),
    sort_by: str = Query(
        "created_at",
        regex="^(created_at|name)$",
    ),
    sort_dir: str = Query(
        "desc",
        regex="^(asc|desc)$",
    ),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    - search: naam/email/bedrijf
    - customer_type: particulier/bedrijf
    - include_inactive (legacy): True -> status=all, False -> status=active
    - status: active/inactive/all (heeft voorrang op include_inactive)
    - sort_by: created_at|name
    - sort_dir: asc|desc
    """
    # backward compatible mapping van include_inactive -> status
    if status_param is None:
        effective_status = "all" if include_inactive else "active"
    else:
        effective_status = status_param

    items, total = list_customers(
        db,
        search=search,
        customer_type=customer_type,
        skip=0,
        limit=100,
        status=effective_status,
        sort_by=sort_by,
        sort_dir=sort_dir,
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


@app.put(
    "/api/admin/customers/{customer_id}",
    response_model=CustomerDetail,
)
def admin_update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    customer = get_customer(db, customer_id)
    if not customer or not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # email-uniekheid indien aangepast
    if payload.email is not None and payload.email.lower() != customer.email.lower():
        existing = get_customer_by_email(db, payload.email)
        if existing and existing.id != customer.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another customer with this email already exists",
            )

    # extra business rule: voor bedrijven company_name + tax_id verplicht
    if payload.customer_type == CustomerType.bedrijf:
        if not payload.company_name or not payload.tax_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_name and tax_id are required for bedrijf customers",
            )

    updated = update_customer(db, customer, payload)
    return CustomerDetail.from_orm(updated)


@app.delete(
    "/api/admin/customers/{customer_id}",
    response_model=SimpleSuccessResponse,
)
def admin_soft_delete_customer(
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

    soft_delete_customer(db, customer)
    return SimpleSuccessResponse(success=True)


@app.post(
    "/api/admin/customers/{customer_id}/reset_password",
    response_model=PasswordResetResponse,
)
def admin_reset_password(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    customer = get_customer(db, customer_id)
    if not customer or not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or inactive",
        )

    # alle oude, ongebruikte tokens ongeldig maken
    mark_all_tokens_used_for_customer(db, customer.id)

    # nieuwe registration_token maken
    token = create_registration_token(db, customer)

    # password-setup link loggen (zelfde stijl als bij registratie)
    try:
        base_url = settings.WEBSITE_PUBLIC_BASE_URL.rstrip("/")
        url = f"{base_url}/password-setup?token={token.token}"
        logger.info(
            "Password reset email stub for %s: %s",
            customer.email,
            url,
        )
    except Exception as e:
        logger.exception("Failed to build password reset URL: %s", e)

    resp = PasswordResetResponse(success=True)
    if settings.WEBSITE_ENV.lower() in {"local", "dev", "development"}:
        resp.token = token.token

    return resp
