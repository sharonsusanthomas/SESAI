from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class QuizGenerateRequest(BaseModel):
    """Schema for quiz generation request"""
    material_id: str
    difficulty: str  # Easy, Medium, Hard
    question_type: str = "multiple-choice"
    count: int = 5


class QuizQuestion(BaseModel):
    """Schema for a quiz question"""
    id: int
    type: str
    text: str
    options: Optional[List[str]] = None
    correctAnswerIndex: Optional[int] = None
    modelAnswer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str


class QuizSubmitRequest(BaseModel):
    """Schema for quiz submission"""
    material_id: str
    difficulty: str
    quiz_type: str
    questions: List[Dict[str, Any]]
    user_answers: List[Any]


class QuizResultResponse(BaseModel):
    """Schema for quiz result response"""
    id: str
    user_id: str
    material_id: Optional[str]
    score: int
    total_questions: int
    difficulty: str
    quiz_type: str
    questions: List[Dict[str, Any]]
    user_answers: List[Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


class QuizHistoryResponse(BaseModel):
    """Schema for quiz history"""
    results: List[QuizResultResponse]
    total: int
