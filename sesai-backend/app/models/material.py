from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid


class Material(Base):
    """Material model for storing uploaded learning materials"""
    __tablename__ = "materials"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    drive_file_id = Column(String(255), nullable=False, index=True)  # Google Drive file ID
    filename = Column(String(500))
    file_type = Column(String(50))  # pdf, image, text, audio
    summary = Column(Text)
    drive_link = Column(Text)  # Web view link to file in Drive
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="materials")
    smart_notes = relationship("SmartNotes", back_populates="material", uselist=False, cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="material")
    
    def __repr__(self):
        return f"<Material {self.filename}>"
