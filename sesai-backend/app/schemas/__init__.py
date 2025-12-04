"""
Pydantic schemas for request/response validation
"""

from app.schemas.user import UserBase, UserCreate, UserResponse, TokenResponse
from app.schemas.material import MaterialBase, MaterialCreate, MaterialResponse, MaterialListResponse
from app.schemas.notes import SmartNotesData, SmartNotesResponse, GenerateNotesRequest
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizQuestion,
    QuizSubmitRequest,
    QuizResultResponse,
    QuizHistoryResponse
)

__all__ = [
    "UserBase",
    "UserCreate",
    "UserResponse",
    "TokenResponse",
    "MaterialBase",
    "MaterialCreate",
    "MaterialResponse",
    "MaterialListResponse",
    "SmartNotesData",
    "SmartNotesResponse",
    "GenerateNotesRequest",
    "QuizGenerateRequest",
    "QuizQuestion",
    "QuizSubmitRequest",
    "QuizResultResponse",
    "QuizHistoryResponse",
]
