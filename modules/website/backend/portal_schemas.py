# modules/website/backend/portal_schemas.py

from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel


# ====== Status & stappen ======

ProcessStatus = Literal["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]


class StatusStep(BaseModel):
    id: int
    label: str
    description: Optional[str] = None
    completed: bool
    current: bool

    class Config:
        orm_mode = True


class PortalStatus(BaseModel):
    overallStatus: ProcessStatus
    progressPercent: int
    currentStepId: Optional[int]
    steps: List[StatusStep]
    lastUpdated: datetime


# ====== Documenten ======

DocumentType = Literal["OFFER", "ORDER", "INVOICE", "OTHER"]


class PortalDocument(BaseModel):
    id: int
    type: DocumentType
    label: str
    createdAt: datetime
    downloadUrl: str

    class Config:
        orm_mode = True


# ====== Vertegenwoordiger ======

class Representative(BaseModel):
    id: int
    fullName: str
    email: str
    phone: Optional[str] = None

    class Config:
        orm_mode = True


# ====== Overzicht ======

class PortalOverviewResponse(BaseModel):
    status: PortalStatus
    documents: List[PortalDocument]
    representative: Optional[Representative]


# ====== AI-chat ======

ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class ChatRequestPayload(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    answer: str
