import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import Customer, CustomerType, RegistrationToken
from schemas import RegistrationRequest, CustomerUpdate
from config import settings
from security import verify_password, get_password_hash


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
    status: str = "active",
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> Tuple[List[Customer], int]:
    """
    Lijst klanten voor admin, met:
    - status filter: active / inactive / all
    - sortering: created_at|name + asc|desc
    """
    query = db.query(Customer)

    # status filter
    if status == "inactive":
        query = query.filter(Customer.is_active.is_(False))
    elif status == "all":
        # geen extra filter
        pass
    else:  # "active" of ongeldige waarde -> default naar active
        query = query.filter(Customer.is_active.is_(True))

    # zoekterm
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

    # type filter
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)

    total = query.count()

    # sortering
    if sort_by == "name":
        if sort_dir == "asc":
            query = query.order_by(
                Customer.last_name.asc(),
                Customer.first_name.asc(),
            )
        else:
            query = query.order_by(
                Customer.last_name.desc(),
                Customer.first_name.desc(),
            )
    else:  # created_at (default)
        if sort_dir == "asc":
            query = query.order_by(Customer.created_at.asc())
        else:
            query = query.order_by(Customer.created_at.desc())

    items = query.offset(skip).limit(limit).all()
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


# === Helpers voor admin password reset ===


def mark_all_tokens_used_for_customer(db: Session, customer_id: uuid.UUID) -> None:
    """
    Zet alle nog niet-gebruikte tokens voor deze klant op used=True.
    Hiermee zorgen we dat enkel de meest recente token nog 'geldig' is.
    """
    (
        db.query(RegistrationToken)
        .filter(
            RegistrationToken.customer_id == customer_id,
            RegistrationToken.used.is_(False),
        )
        .update({"used": True}, synchronize_session=False)
    )
    db.commit()


def set_customer_password(
    db: Session,
    customer: Customer,
    password: str,
) -> Customer:
    """
    Zet/overschrijft het wachtwoord van een klant.
    Wordt gebruikt bij password-setup én admin reset flows.
    """
    customer.hashed_password = get_password_hash(password)
    customer.updated_at = datetime.now(timezone.utc)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def authenticate_customer(
    db: Session,
    email: str,
    password: str,
) -> Optional[Customer]:
    """
    Helper (nu nog niet gebruikt in app.py): alleen actieve klanten met wachtwoord.
    """
    customer = get_customer_by_email(db, email=email)
    if not customer or not customer.is_active or not customer.hashed_password:
        return None
    if not verify_password(password, customer.hashed_password):
        return None
    return customer


# === Update & soft delete voor admin ===


def update_customer(
    db: Session,
    customer: Customer,
    customer_in: CustomerUpdate,
) -> Customer:
    """
    Partiële update: alleen velden die niet None zijn worden overschreven.
    """
    if customer_in.email is not None:
        customer.email = customer_in.email

    if customer_in.first_name is not None:
        customer.first_name = customer_in.first_name
    if customer_in.last_name is not None:
        customer.last_name = customer_in.last_name
    if customer_in.phone_number is not None:
        customer.phone_number = customer_in.phone_number
    if customer_in.customer_type is not None:
        customer.customer_type = customer_in.customer_type
    if customer_in.description is not None:
        customer.description = customer_in.description

    if customer_in.company_name is not None:
        customer.company_name = customer_in.company_name
    if customer_in.tax_id is not None:
        customer.tax_id = customer_in.tax_id

    if customer_in.address_street is not None:
        customer.address_street = customer_in.address_street
    if customer_in.address_ext_number is not None:
        customer.address_ext_number = customer_in.address_ext_number
    if customer_in.address_int_number is not None:
        customer.address_int_number = customer_in.address_int_number
    if customer_in.address_neighborhood is not None:
        customer.address_neighborhood = customer_in.address_neighborhood
    if customer_in.address_city is not None:
        customer.address_city = customer_in.address_city
    if customer_in.address_state is not None:
        customer.address_state = customer_in.address_state
    if customer_in.address_postal_code is not None:
        customer.address_postal_code = customer_in.address_postal_code
    if customer_in.address_country is not None:
        customer.address_country = customer_in.address_country

    if customer_in.is_active is not None:
        customer.is_active = customer_in.is_active
    if customer_in.is_admin is not None:
        customer.is_admin = customer_in.is_admin

    customer.updated_at = datetime.now(timezone.utc)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def soft_delete_customer(
    db: Session,
    customer: Customer,
) -> Customer:
    """
    Soft delete: zet is_active=False en deactivated_at (als kolom bestaat) naar nu.
    """
    if not customer.is_active:
        return customer

    customer.is_active = False
    if hasattr(customer, "deactivated_at"):
        customer.deactivated_at = datetime.now(timezone.utc)

    customer.updated_at = datetime.now(timezone.utc)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
