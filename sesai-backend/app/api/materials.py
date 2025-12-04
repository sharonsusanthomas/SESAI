from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from app.database import get_db
from app.models.user import User
from app.models.material import Material
from app.utils.dependencies import get_current_user
from app.schemas.material import MaterialResponse, MaterialListResponse
from app.services.google_drive import GoogleDriveService
from app.services.openai_service import openai_service
from app.services.file_processor import extract_pdf_text, get_file_type
import os
import tempfile

router = APIRouter()


@router.post("/upload", response_model=MaterialResponse)
async def upload_material(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a learning material file
    Uploads to Drive synchronously, then saves to DB
    """
    # Save file temporarily
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Determine file type
        file_type = get_file_type(file.filename)
        
        # Extract content for AI processing
        if file_type == 'pdf':
            text_content = extract_pdf_text(temp_path)
        elif file_type == 'text':
            with open(temp_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
        else:
            text_content = ""
            
        # Upload to Google Drive (Synchronous)
        if not current_user.google_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Drive access token missing. Please log in again."
            )
            
        creds = Credentials(
            token=current_user.google_access_token,
            refresh_token=current_user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
        
        drive_service = GoogleDriveService(creds)
        
        # Ensure upload folder exists and is valid
        folder_valid = False
        if current_user.drive_folder_id:
            folder_valid = drive_service.validate_folder(current_user.drive_folder_id)
            
        if not folder_valid:
            print("⚠️ Main SESAI folder missing or invalid. Recreating structure...")
            folders = drive_service.setup_sesai_folder_structure()
            current_user.drive_folder_id = folders['sesai']
            db.commit()
            
        uploads_folder_id = drive_service.get_or_create_folder("uploads", current_user.drive_folder_id)
        
        # Upload file
        print(f"📤 Uploading {file.filename} to Drive...")
        drive_file = drive_service.upload_file(
            file_path=temp_path,
            filename=file.filename,
            parent_id=uploads_folder_id,
            mime_type=file.content_type
        )
        print(f"✅ Upload complete. File ID: {drive_file['id']}")

        # Generate summary with OpenAI
        if text_content:
            summary = await openai_service.generate_summary(text_content, file_type)
        else:
            summary = "File uploaded successfully"
            
        # Create material record
        material = Material(
            user_id=current_user.id,
            drive_file_id=drive_file['id'],
            filename=file.filename,
            file_type=file_type,
            summary=summary,
            drive_link=drive_file.get('webViewLink')
        )
        
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return MaterialResponse.from_orm(material)
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.unlink(temp_path)


@router.get("/", response_model=MaterialListResponse)
async def list_materials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all materials for current user
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of materials
    """
    materials = db.query(Material).filter(
        Material.user_id == current_user.id
    ).order_by(Material.created_at.desc()).all()
    
    return MaterialListResponse(
        materials=[MaterialResponse.from_orm(m) for m in materials],
        total=len(materials)
    )


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific material
    
    Args:
        material_id: Material ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Material data
    """
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    return MaterialResponse.from_orm(material)


@router.delete("/{material_id}")
async def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a material
    
    Args:
        material_id: Material ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
    """
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    db.delete(material)
    db.commit()
    
    return {"message": "Material deleted successfully"}


@router.get("/{material_id}/content")
async def get_material_content(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get material content from Drive for display
    """
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
        
    if not current_user.google_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Drive access required"
        )
        
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
        
        # Extract text based on type
        content = ""
        if material.file_type == 'pdf':
            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                content = extract_pdf_text(temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            # Assume text
            content = file_content.decode('utf-8', errors='ignore')
            
        return {"content": content}
        
    except Exception as e:
        print(f"❌ Failed to fetch content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch content from Drive"
        )
