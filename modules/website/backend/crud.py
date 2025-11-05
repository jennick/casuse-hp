import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
import uuid

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import Customer, CustomerType, RegistrationToken
from schemas import RegistrationRequest
from config import settings


def get_customer_by_email(db: Session, email: str) -> Optional[Customer]:
    return (
        db.query(Customer)
        .filter(func.lower(Customer.email) == email.lower())
        .first()
    )


def get_customer(db: Session, customer_id: uuid.UUID) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.id == customer_id).first()


def create_customer(
    db: Session,
    registration: RegistrationRequest,
    hashed_password: Optional[str] = None,
    is_admin: bool = False,
) -> Customer:
    customer = Customer(
        email=registration.email,
        hashed_password=hashed_password,
        first_name=registration.first_name,
        last_name=registration.last_name,
        phone_number=registration.phone_number,
        customer_type=registration.customer_type,
        description=registration.description,
        is_active=True,
        is_admin=is_admin,
        company_name=registration.company_name,
        tax_id=registration.tax_id,
        address_street=registration.address_street,
        address_ext_number=registration.address_ext_number,
        address_int_number=registration.address_int_number,
        address_neighborhood=registration.address_neighborhood,
        address_city=registration.address_city,
        address_state=registration.address_state,
        address_postal_code=registration.address_postal_code,
        address_country=registration.address_country or "Mexico",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(
    db: Session,
    search: Optional[str] = None,
    customer_type: Optional[CustomerType] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Customer], int]:
    query = db.query(Customer)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Customer.first_name).like(term),
                func.lower(Customer.last_name).like(term),
                func.lower(Customer.email).like(term),
                func.lower(func.coalesce(Customer.company_name, "")).like(term),
            )
        )

    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)

    total = query.count()
    items = (
        query.order_by(Customer.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return items, total


def create_registration_token(
    db: Session,
    customer: Customer,
) -> RegistrationToken:
    ttl_minutes = settings.WEBSITE_REGISTRATION_TOKEN_TTL_MINUTES
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

    token_value = secrets.token_urlsafe(32)
    token = RegistrationToken(
        customer_id=customer.id,
        token=token_value,
        expires_at=expires_at,
        used=False,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_registration_token(
    db: Session,
    token_str: str,
) -> Optional[RegistrationToken]:
    return (
        db.query(RegistrationToken)
        .filter(RegistrationToken.token == token_str)
        .first()
    )


def mark_registration_token_used(
    db: Session,
    token: RegistrationToken,
) -> None:
    token.used = True
    db.add(token)
    db.commit()
