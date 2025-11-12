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

    # ─────────────────────────────────────────────
    # Extra helpers voor portal / login status
    # (geen nieuwe kolommen in de database)
    # ─────────────────────────────────────────────

    @property
    def has_portal_password(self) -> bool:
        """
        Geeft aan of deze klant al een wachtwoord heeft ingesteld
        (dus effectief kan inloggen in het portaal).
        """
        return self.hashed_password is not None

    @property
    def has_login(self) -> bool:
        """
        Alias voor has_portal_password, zodat de Pydantic-schemas
        (CustomerListItem / CustomerDetail) het veld 'has_login'
        via from_orm kunnen invullen.
        """
        return self.has_portal_password

    @property
    def latest_registration_token(self):
        """
        Handige helper om het meest recente registratietoken op te vragen.
        Kan None zijn als er geen tokens zijn.
        """
        if not self.registration_tokens:
            return None
        return max(self.registration_tokens, key=lambda t: t.created_at)

    @property
    def portal_status(self) -> str:
        """
        Eenvoudige status om in de admin te tonen.

        Mogelijke waarden:
        - "active"              -> klant is actief en heeft een wachtwoord
        - "invited"             -> uitnodiging verstuurd, nog niet gebruikt en niet verlopen
        - "invitation_expired"  -> uitnodiging verstuurd, maar token is verlopen
        - "no_invitation"       -> geen uitnodiging/token gevonden
        """
        if self.has_portal_password and self.is_active:
            return "active"

        token = self.latest_registration_token

        if token is None:
            return "no_invitation"

        if token.used:
            # Token is gebruikt maar er is blijkbaar nog geen wachtwoord;
            # dit zou normaal niet mogen voorkomen, maar we vangen het netjes op.
            return "no_invitation"

        if token.expires_at < utcnow():
            return "invitation_expired"

        return "invited"


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

    # Extra helper om snel te checken of een token nog geldig is
    @property
    def is_expired(self) -> bool:
        return self.expires_at < utcnow()
