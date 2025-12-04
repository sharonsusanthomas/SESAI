from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.material import Material
from app.utils.dependencies import get_current_user
from app.services.openai_service import openai_service
from pydantic import BaseModel
from typing import List, Optional
import os
from google.oauth2.credentials import Credentials
from app.services.google_drive import GoogleDriveService
import tempfile
from app.services.file_processor import extract_pdf_text

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    material_id: Optional[str] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_tutor(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with AI Tutor using OpenAI
    """
    context_content = request.context
    
    # If material_id is provided, fetch content from Drive
    if request.material_id:
        material = db.query(Material).filter(
            Material.id == request.material_id,
            Material.user_id == current_user.id
        ).first()
        
        if material and material.drive_file_id and current_user.google_access_token:
            try:
                # Setup Drive service
                creds = Credentials(
                    token=current_user.google_access_token,
                    refresh_token=current_user.google_refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=os.getenv("GOOGLE_CLIENT_ID"),
                    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                    scopes=['https://www.googleapis.com/auth/drive.file']
                )
                drive_service = GoogleDriveService(creds)
                
                # Download file
                file_content = drive_service.download_file(material.drive_file_id)
                
                # Save to temp file for processing
                suffix = ".pdf" if material.file_type == "pdf" else ".txt"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                    temp_file.write(file_content)
                    temp_path = temp_file.name
                
                # Extract text
                extracted_text = ""
                if material.file_type == 'pdf':
                    extracted_text = extract_pdf_text(temp_path)
                else:
                    # Assume text/markdown
                    with open(temp_path, 'r', encoding='utf-8', errors='ignore') as f:
                        extracted_text = f.read()
                
                # Clean up
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
                if extracted_text.strip():
                    context_content = f"Title: {material.filename}\n\nContent:\n{extracted_text}"
                else:
                    context_content = material.summary or "Content could not be extracted."
                    
            except Exception as e:
                print(f"❌ Failed to fetch from Drive for chat: {str(e)}")
                # Fallback to summary
                context_content = material.summary
    
    # Format messages for OpenAI
    formatted_messages = [{"role": m.role, "content": m.text} for m in request.messages]
    
    # Call OpenAI service
    response_text = await openai_service.chat_tutor(formatted_messages, context=context_content)
    
    return ChatResponse(response=response_text)


class EvaluationRequest(BaseModel):
    question: str
    user_answer: str
    model_answer: str
    max_marks: int

class EvaluationResponse(BaseModel):
    score: int
    feedback: str

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(
    request: EvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluate student answer using OpenAI
    """
    result = await openai_service.evaluate_answer(
        question=request.question,
        user_answer=request.user_answer,
        model_answer=request.model_answer,
        max_marks=request.max_marks
    )
    
    return EvaluationResponse(
        score=result.get("score", 0),
        feedback=result.get("feedback", "No feedback provided.")
    )
