from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid


class UserSettings(Base):
    """User settings model for storing user preferences"""
    __tablename__ = "user_settings"
    
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme = Column(String(20), default="light")
    language = Column(String(10), default="en")
    auto_sync = Column(Boolean, default=True)
    notifications = Column(Boolean, default=True)
    settings = Column(JSON)  # Additional settings as JSON
    
    # Relationships
    user = relationship("User", back_populates="settings")
    
    def __repr__(self):
        return f"<UserSettings for user {self.user_id}>"


class UserAnalytics(Base):
    """User analytics model for tracking user events"""
    __tablename__ = "user_analytics"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), index=True)  # 'quiz_completed', 'material_uploaded', etc.
    event_data = Column(JSON)  # Event-specific data
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="analytics")
    
    def __repr__(self):
        return f"<UserAnalytics {self.event_type}>"
