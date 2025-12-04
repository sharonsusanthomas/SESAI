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
    
    Args:
        file: Uploaded file
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created material data
    """
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
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
            text_content = ""  # For images, we'll process differently
        
        # Upload to Google Drive
        if not current_user.google_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Drive access token missing. Please log in again."
            )
            
        # Create credentials object from stored tokens
        creds = Credentials(
            token=current_user.google_access_token,
            refresh_token=current_user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
        
        drive_service = GoogleDriveService(creds)
        
        # Ensure upload folder exists
        if not current_user.drive_folder_id:
            # Try to recreate structure if missing
            folders = drive_service.setup_sesai_folder_structure()
            current_user.drive_folder_id = folders['sesai']
            db.commit()
            
        # Get uploads folder ID (we need to find it or just use the main folder)
        # For simplicity, we'll list children of main folder to find 'uploads'
        # In a real app, we might store all folder IDs in the user model or a separate table
        # For now, let's just upload to the main SESAI folder if we can't find 'uploads' easily
        # Or better, let's just use get_or_create_folder again which is idempotent
        uploads_folder_id = drive_service.get_or_create_folder("uploads", current_user.drive_folder_id)
        
        # Upload file
        drive_file = drive_service.upload_file(
            file_path=temp_path,
            filename=file.filename,
            parent_id=uploads_folder_id,
            mime_type=file.content_type
        )
        
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
    List all materials for current user, syncing with Google Drive
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of materials
    """
    # Sync with Google Drive if tokens are available
    if current_user.google_access_token:
        try:
            # Create credentials object
            creds = Credentials(
                token=current_user.google_access_token,
                refresh_token=current_user.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                scopes=['https://www.googleapis.com/auth/drive.file']
            )
            
            drive_service = GoogleDriveService(creds)
            
            # Ensure folder structure exists
            if not current_user.drive_folder_id:
                folders = drive_service.setup_sesai_folder_structure()
                current_user.drive_folder_id = folders['sesai']
                db.commit()
                uploads_folder_id = folders['uploads']
            else:
                uploads_folder_id = drive_service.get_or_create_folder("uploads", current_user.drive_folder_id)
            
            # List files from Drive
            drive_files = drive_service.list_files(uploads_folder_id)
            print(f"📂 Found {len(drive_files)} files in Drive folder {uploads_folder_id}")
            for f in drive_files:
                print(f"   - {f.get('name')} ({f.get('id')})")
            
            # Get existing drive file IDs from DB
            existing_materials = db.query(Material).filter(
                Material.user_id == current_user.id
            ).all()
            existing_drive_ids = {m.drive_file_id for m in existing_materials}
            
            # Add missing files
            new_materials = []
            for file in drive_files:
                if file['id'] not in existing_drive_ids:
                    file_type = get_file_type(file['name'])
                    
                    new_material = Material(
                        user_id=current_user.id,
                        drive_file_id=file['id'],
                        filename=file['name'],
                        file_type=file_type,
                        summary="Synced from Google Drive",
                        drive_link=file.get('webViewLink')
                    )
                    new_materials.append(new_material)
            
            if new_materials:
                db.add_all(new_materials)
                db.commit()
                
        except Exception as e:
            print(f"Drive sync failed: {str(e)}")
            # Continue to return local materials even if sync fails

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
