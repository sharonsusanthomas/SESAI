from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.material import Material
from app.models.quiz import QuizResult
from app.utils.dependencies import get_current_user
from typing import Dict, Any

router = APIRouter()


@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get user statistics
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        User statistics
    """
    # Count materials
    total_materials = db.query(func.count(Material.id)).filter(
        Material.user_id == current_user.id
    ).scalar()
    
    # Count quizzes
    total_quizzes = db.query(func.count(QuizResult.id)).filter(
        QuizResult.user_id == current_user.id
    ).scalar()
    
    # Calculate average score
    avg_score = db.query(func.avg(QuizResult.score)).filter(
        QuizResult.user_id == current_user.id
    ).scalar() or 0
    
    # Get recent quiz results
    recent_quizzes = db.query(QuizResult).filter(
        QuizResult.user_id == current_user.id
    ).order_by(QuizResult.created_at.desc()).limit(10).all()
    
    return {
        "total_materials": total_materials,
        "total_quizzes": total_quizzes,
        "average_score": round(float(avg_score), 2),
        "recent_activity": len(recent_quizzes)
    }


@router.get("/progress")
async def get_learning_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get learning progress over time
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Progress data
    """
    # Get quiz results grouped by date
    quiz_results = db.query(QuizResult).filter(
        QuizResult.user_id == current_user.id
    ).order_by(QuizResult.created_at).all()
    
    # Calculate progress metrics
    progress_data = []
    for result in quiz_results:
        percentage = (result.score / result.total_questions * 100) if result.total_questions > 0 else 0
        progress_data.append({
            "date": result.created_at.isoformat(),
            "score": result.score,
            "total": result.total_questions,
            "percentage": round(percentage, 2),
            "difficulty": result.difficulty
        })
    
    return {
        "progress": progress_data,
        "total_attempts": len(progress_data)
    }
