from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.material import Material
from app.models.quiz import QuizResult
from app.utils.dependencies import get_current_user
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizQuestion,
    QuizSubmitRequest,
    QuizResultResponse,
    QuizHistoryResponse
)
from app.services.openai_service import openai_service
from typing import List

router = APIRouter()


@router.post("/generate", response_model=List[QuizQuestion])
async def generate_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate quiz questions for a material
    
    Args:
        request: Quiz generation parameters
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of generated questions
    """
    # Get material
    material = db.query(Material).filter(
        Material.id == request.material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    try:
        # Generate quiz with OpenAI
        content = material.summary or "No content available"
        questions = await openai_service.generate_quiz(
            content=content,
            difficulty=request.difficulty,
            question_type=request.question_type,
            count=request.count
        )
    except Exception as e:
        print(f"❌ Quiz generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quiz generation failed: {str(e)}"
        )
    
    return [QuizQuestion(**q) for q in questions]


@router.post("/submit", response_model=QuizResultResponse)
async def submit_quiz(
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit quiz answers and get results
    Saves results to Google Drive for persistence
    
    Args:
        request: Quiz submission data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Quiz result with score
    """
    # Calculate score for MCQ
    score = 0
    if request.quiz_type == "multiple-choice":
        for i, question in enumerate(request.questions):
            if i < len(request.user_answers):
                if request.user_answers[i] == question.get("correctAnswerIndex"):
                    score += 1
    
    # Create quiz result
    quiz_result = QuizResult(
        user_id=current_user.id,
        material_id=request.material_id,
        score=score,
        total_questions=len(request.questions),
        difficulty=request.difficulty,
        quiz_type=request.quiz_type,
        questions=request.questions,
        user_answers=request.user_answers
    )
    
    db.add(quiz_result)
    db.commit()
    db.refresh(quiz_result)
    
    # Save to Google Drive
    if current_user.google_access_token:
        try:
            from google.oauth2.credentials import Credentials
            from app.services.google_drive import GoogleDriveService
            from app.services.drive_cache_manager import DriveCacheManager
            import os
            from datetime import datetime
            
            creds = Credentials(
                token=current_user.google_access_token,
                refresh_token=current_user.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                scopes=['https://www.googleapis.com/auth/drive.file']
            )
            
            drive_service = GoogleDriveService(creds)
            
            # Get folder IDs
            folders = {
                'sesai': current_user.drive_folder_id,
                'quizzes': drive_service.get_or_create_folder("quizzes", current_user.drive_folder_id),
            }
            
            cache_manager = DriveCacheManager(drive_service, folders)
            
            # Save quiz result to Drive
            result_data = {
                "quiz_id": quiz_result.id,
                "material_id": request.material_id,
                "score": score,
                "total_questions": len(request.questions),
                "percentage": (score / len(request.questions) * 100) if len(request.questions) > 0 else 0,
                "difficulty": request.difficulty,
                "quiz_type": request.quiz_type,
                "questions": request.questions,
                "user_answers": request.user_answers,
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            cache_manager.save_quiz_result(quiz_result.id, result_data)
            print(f"💾 Saved quiz result {quiz_result.id} to Drive")
            
        except Exception as e:
            print(f"⚠️ Failed to save quiz to Drive: {str(e)}")
            # Continue even if Drive save fails
    
    return QuizResultResponse.from_orm(quiz_result)


@router.get("/history", response_model=QuizHistoryResponse)
async def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """
    Get quiz history for current user
    
    Args:
        current_user: Current authenticated user
        db: Database session
        limit: Maximum number of results
        
    Returns:
        List of quiz results
    """
    results = db.query(QuizResult).filter(
        QuizResult.user_id == current_user.id
    ).order_by(QuizResult.created_at.desc()).limit(limit).all()
    
    return QuizHistoryResponse(
        results=[QuizResultResponse.from_orm(r) for r in results],
        total=len(results)
    )


@router.get("/{quiz_id}", response_model=QuizResultResponse)
async def get_quiz_result(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific quiz result
    
    Args:
        quiz_id: Quiz result ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Quiz result data
    """
    result = db.query(QuizResult).filter(
        QuizResult.id == quiz_id,
        QuizResult.user_id == current_user.id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz result not found"
        )
    
    return QuizResultResponse.from_orm(result)
