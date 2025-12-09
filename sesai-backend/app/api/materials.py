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
from app.schemas.material import MaterialResponse, MaterialListResponse, MaterialDetailResponse

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
        
        # Extract content page-by-page for JSON storage
        pages_data = []
        full_text_content = ""
        
        if file_type == 'pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(temp_path)
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                pages_data.append({"page": i + 1, "text": txt})
                full_text_content += txt + "\n"
        else:
            # Text based
            with open(temp_path, 'r', encoding='utf-8') as f:
                full_text_content = f.read()
            pages_data.append({"page": 1, "text": full_text_content})
            
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
        
        # Ensure folders
        folder_valid = False
        if current_user.drive_folder_id:
            folder_valid = drive_service.validate_folder(current_user.drive_folder_id)
        if not folder_valid:
            folders = drive_service.setup_sesai_folder_structure()
            current_user.drive_folder_id = folders['sesai']
            db.commit()

        uploads_folder_id = drive_service.get_or_create_folder("uploads", current_user.drive_folder_id)
        data_folder_id = drive_service.get_or_create_folder("sesai_data", current_user.drive_folder_id)
        
        # Upload Original File
        print(f"📤 Uploading {file.filename} to Drive...")
        drive_file = drive_service.upload_file(
            file_path=temp_path,
            filename=file.filename,
            parent_id=uploads_folder_id,
            mime_type=file.content_type
        )
        
        # Upload Extracted Content as JSON
        import json
        json_filename = f"{os.path.splitext(file.filename)[0]}_content.json"
        
        # Save JSON temporarily
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".json", encoding='utf-8') as json_temp:
            json.dump(pages_data, json_temp)
            json_path = json_temp.name
            
        print(f"📤 Uploading content JSON to Drive...")
        content_file = drive_service.upload_file(
            file_path=json_path,
            filename=json_filename,
            parent_id=data_folder_id,
            mime_type="application/json"
        )
        os.unlink(json_path) # Clean up JSON temp

        # Generate summary
        if full_text_content:
            summary = await openai_service.generate_summary(full_text_content[:15000], file_type)
        else:
            summary = "File uploaded successfully"
            
        # Create material record
        material = Material(
            user_id=current_user.id,
            drive_file_id=drive_file['id'],
            filename=file.filename,
            file_type=file_type,
            summary=summary,
            content_file_id=content_file['id'],  # Save JSON file ID
            drive_link=drive_file.get('webViewLink')
        )
        
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return MaterialDetailResponse(
            id=material.id,
            user_id=material.user_id,
            drive_file_id=material.drive_file_id,
            filename=material.filename,
            file_type=material.file_type,
            summary=material.summary,
            drive_link=material.drive_link,
            created_at=material.created_at,
            updated_at=material.updated_at,
            content=full_text_content # Return content eagerly for UI
        )
        
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


@router.get("/{material_id}", response_model=MaterialDetailResponse)
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
    
    material_detail = MaterialDetailResponse.from_orm(material)
    
    # Try to fetch content from Drive JSON if available
    if material.content_file_id and current_user.google_access_token:
        try:
            creds = Credentials(
                token=current_user.google_access_token,
                refresh_token=current_user.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                scopes=['https://www.googleapis.com/auth/drive.file']
            )
            drive_service = GoogleDriveService(creds)
            
            # Download JSON content
            import json
            content_bytes = drive_service.download_file(material.content_file_id)
            pages_data = json.loads(content_bytes.decode('utf-8'))
            
            # Reconstruct full text
            full_text = "\n".join([p['text'] for p in pages_data])
            material_detail.content = full_text
            
        except Exception as e:
            print(f"⚠️ Failed to fetch content for material {material_id}: {e}")
            # Don't fail the request, just return without content
            pass
            
    return material_detail


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
        
        # Check if we have extracted content JSON
        if material.content_file_id:
            try:
                # Download JSON content
                import json
                content_bytes = drive_service.download_file(material.content_file_id)
                pages_data = json.loads(content_bytes.decode('utf-8'))
                
                # Reconstruct full text
                content = "\n".join([p['text'] for p in pages_data])
                return {"content": content}
            except Exception as e:
                 print(f"⚠️ Failed to fetch content JSON, falling back to raw file: {e}")

        # Fallback to original file download (Slow)
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
