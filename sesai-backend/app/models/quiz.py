from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid


class QuizResult(Base):
    """Quiz result model for storing quiz attempts and scores"""
    __tablename__ = "quiz_results"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(CHAR(36), ForeignKey("materials.id", ondelete="SET NULL"), index=True)
    score = Column(Integer)
    total_questions = Column(Integer)
    difficulty = Column(String(50))
    quiz_type = Column(String(50))
    questions = Column(JSON)  # Array of question objects
    user_answers = Column(JSON)  # Array of user answers
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="quiz_results")
    material = relationship("Material", back_populates="quiz_results")
    
    def __repr__(self):
        return f"<QuizResult {self.score}/{self.total_questions}>"
