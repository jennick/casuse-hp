# modules/website/backend/portal_models.py

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base  # zelfde patroon als elders in je backend


class PortalStatus(Base):
    """
    Hoofdstatus per klant voor het klantenportaal.
    Eén record per klant (maximaal).
    """

    __tablename__ = "portal_statuses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(UUID(as_uuid=True), index=True, nullable=False)

    # NOT_STARTED | IN_PROGRESS | ON_HOLD | COMPLETED
    overall_status = Column(String, nullable=False, default="NOT_STARTED")
    progress_percent = Column(Integer, nullable=False, default=0)

    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relatie naar stappen, via echte ForeignKey op PortalStatusStep.status_id
    steps = relationship(
        "PortalStatusStep",
        back_populates="status",
        cascade="all, delete-orphan",
        order_by="PortalStatusStep.order_index",
    )


class PortalStatusStep(Base):
    """
    Stappen binnen de status van een klant.
    """

    __tablename__ = "portal_status_steps"

    id = Column(Integer, primary_key=True, index=True)
    status_id = Column(
        Integer,
        ForeignKey("portal_statuses.id", ondelete="CASCADE"),
        nullable=False,
    )

    label = Column(String, nullable=False)
    description = Column(String, nullable=True)

    order_index = Column(Integer, nullable=False, default=0)
    completed = Column(Boolean, nullable=False, default=False)
    current = Column(Boolean, nullable=False, default=False)

    status = relationship("PortalStatus", back_populates="steps")


class PortalDocument(Base):
    """
    Documenten die in het portaal getoond worden.
    Kan verwijzen naar offertes, bestellingen, facturen, ...
    """

    __tablename__ = "portal_documents"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(UUID(as_uuid=True), index=True, nullable=False)

    # OFFER | ORDER | INVOICE | OTHER
    type = Column(String, nullable=False, default="OTHER")
    label = Column(String, nullable=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    download_url = Column(String, nullable=False)


class PortalRepresentative(Base):
    """
    Vertegenwoordiger-contactinfo gekoppeld aan een klant.
    Eén record per klant (customer_id is unique).
    """

    __tablename__ = "portal_representatives"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(UUID(as_uuid=True), index=True, nullable=False, unique=True)

    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
