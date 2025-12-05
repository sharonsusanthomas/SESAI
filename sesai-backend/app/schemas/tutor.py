from pydantic import BaseModel
from typing import List, Optional


class SmartChatMessage(BaseModel):
    """Message in smart chat conversation"""
    role: str
    text: str


class SmartChatRequest(BaseModel):
    """Request for smart chat with context extension capability"""
    messages: List[SmartChatMessage]
    material_id: Optional[str] = None
    context: Optional[str] = None
    allow_external: bool = False  # User permission flag for external search
    subject_hint: Optional[str] = None  # Subject matter from material


class Reference(BaseModel):
    """Reference source for external knowledge"""
    source: str
    relevance: str


class SmartChatResponse(BaseModel):
    """Response from smart chat"""
    response: str
    needs_permission: bool = False  # True if answer not in context
    used_external: bool = False  # True if external knowledge was used
    references: Optional[List[Reference]] = None
    subject: Optional[str] = None  # Detected subject matter
