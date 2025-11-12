# modules/website/backend/portal_crud.py

from typing import List, Optional

from sqlalchemy.orm import Session

import portal_models


def get_portal_status_for_customer(
    db: Session, customer_id
) -> Optional[portal_models.PortalStatus]:
    return (
        db.query(portal_models.PortalStatus)
        .filter(portal_models.PortalStatus.customer_id == customer_id)
        .first()
    )


def get_portal_steps_for_status(
    db: Session, status_id: int
) -> List[portal_models.PortalStatusStep]:
    return (
        db.query(portal_models.PortalStatusStep)
        .filter(portal_models.PortalStatusStep.status_id == status_id)
        .order_by(portal_models.PortalStatusStep.order_index.asc())
        .all()
    )


def get_portal_documents_for_customer(
    db: Session, customer_id
) -> List[portal_models.PortalDocument]:
    return (
        db.query(portal_models.PortalDocument)
        .filter(portal_models.PortalDocument.customer_id == customer_id)
        .order_by(portal_models.PortalDocument.created_at.desc())
        .all()
    )


def get_portal_representative_for_customer(
    db: Session, customer_id
) -> Optional[portal_models.PortalRepresentative]:
    return (
        db.query(portal_models.PortalRepresentative)
        .filter(portal_models.PortalRepresentative.customer_id == customer_id)
        .first()
    )
