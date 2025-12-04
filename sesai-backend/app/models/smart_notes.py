from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid


class SmartNotes(Base):
    """Smart notes model for storing AI-generated structured notes"""
    __tablename__ = "smart_notes"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    material_id = Column(CHAR(36), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    drive_file_id = Column(String(255))  # JSON file ID in Drive
    notes_data = Column(JSON)  # Cached copy of notes
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    material = relationship("Material", back_populates="smart_notes")
    
    def __repr__(self):
        return f"<SmartNotes for material {self.material_id}>"
