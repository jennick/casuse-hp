import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    Enum,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class CustomerType(str, enum.Enum):
    particulier = "particulier"
    bedrijf = "bedrijf"


def utcnow():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(50), nullable=True)

    customer_type = Column(Enum(CustomerType), nullable=False)
    description = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    is_admin = Column(Boolean, nullable=False, default=False)

    company_name = Column(String(255), nullable=True)
    tax_id = Column(String(50), nullable=True)

    address_street = Column(String(255), nullable=True)
    address_ext_number = Column(String(50), nullable=True)
    address_int_number = Column(String(50), nullable=True)
    address_neighborhood = Column(String(255), nullable=True)
    address_city = Column(String(255), nullable=True)
    address_state = Column(String(255), nullable=True)
    address_postal_code = Column(String(20), nullable=True)
    address_country = Column(String(100), nullable=False, default="Mexico")

    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    registration_tokens = relationship(
        "RegistrationToken",
        back_populates="customer",
        cascade="all, delete-orphan",
    )


class RegistrationToken(Base):
    __tablename__ = "registration_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    customer = relationship("Customer", back_populates="registration_tokens")
