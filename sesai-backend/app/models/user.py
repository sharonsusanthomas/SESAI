from sqlalchemy import Column, String, DateTime, Text, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid


class User(Base):
    """User model for storing Google OAuth user data"""
    __tablename__ = "users"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    picture_url = Column(Text)
    drive_folder_id = Column(String(255))  # SESAI folder ID in user's Drive
    
    # Google OAuth tokens for offline access
    google_access_token = Column(Text)
    google_refresh_token = Column(Text)
    token_expiry = Column(DateTime)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    materials = relationship("Material", back_populates="user", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="user", cascade="all, delete-orphan")
    analytics = relationship("UserAnalytics", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
