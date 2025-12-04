"""
Database models for SESAI backend
"""

from app.models.user import User
from app.models.material import Material
from app.models.smart_notes import SmartNotes
from app.models.quiz import QuizResult
from app.models.analytics import UserSettings, UserAnalytics

__all__ = [
    "User",
    "Material",
    "SmartNotes",
    "QuizResult",
    "UserSettings",
    "UserAnalytics",
]
