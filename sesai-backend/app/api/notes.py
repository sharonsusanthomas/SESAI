from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.material import Material
from app.models.smart_notes import SmartNotes
from app.utils.dependencies import get_current_user
from app.schemas.notes import SmartNotesResponse, SmartNotesData
from app.services.openai_service import openai_service
import os
from google.oauth2.credentials import Credentials
from app.services.google_drive import GoogleDriveService

router = APIRouter()


@router.post("/generate/{material_id}", response_model=SmartNotesResponse)
async def generate_smart_notes(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate smart notes for a material using multi-agent processing
    Checks cache first, uses parallel processing for large documents
    
    Args:
        material_id: Material ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Generated smart notes
    """
    # Get material
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Check if notes already exist in database
    existing_notes = db.query(SmartNotes).filter(
        SmartNotes.material_id == material_id
    ).first()
    
    if existing_notes:
        print(f"ℹ️ Notes already exist in database for {material_id}")
        return SmartNotesResponse.from_orm(existing_notes)
    
    # Setup Drive service and cache manager
    if not current_user.google_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Drive access required"
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
    
    # Ensure folder structure exists and is valid
    folder_valid = False
    if current_user.drive_folder_id:
        folder_valid = drive_service.validate_folder(current_user.drive_folder_id)
        
    if not folder_valid:
        print("⚠️ Main SESAI folder missing or invalid. Recreating structure...")
        folders = drive_service.setup_sesai_folder_structure()
        current_user.drive_folder_id = folders['sesai']
        db.commit()
        
        # Update folders dict with new IDs
        folders = {
            'sesai': folders['sesai'],
            'smart_notes': folders['smart_notes'],
            'quizzes': folders['quizzes'],
            'metadata': folders['metadata'],
        }
    else:
        # Get folder IDs
        folders = {
            'sesai': current_user.drive_folder_id,
            'smart_notes': drive_service.get_or_create_folder("smart_notes", current_user.drive_folder_id),
            'quizzes': drive_service.get_or_create_folder("quizzes", current_user.drive_folder_id),
            'metadata': drive_service.get_or_create_folder("metadata", current_user.drive_folder_id),
        }
    
    # Initialize cache manager
    from app.services.drive_cache_manager import DriveCacheManager
    cache_manager = DriveCacheManager(drive_service, folders)
    
    # Check Drive cache
    print(f"\n🔍 Checking cache for material {material_id}...")
    cached_notes = cache_manager.check_notes_cache(material_id)
    
    if cached_notes and cached_notes.get('notes'):
        print(f"✅ Using cached notes from Drive")
        notes_data = cached_notes['notes']
    else:
        # Download file from Drive
        print(f"\n📥 Downloading file from Drive...")
        file_content = drive_service.download_file(material.drive_file_id)
        
        # Save to temp file for processing
        import tempfile
        from app.services.file_processor import extract_pdf_text
        from app.services.multi_agent_processor import MultiAgentProcessor
        
        suffix = ".pdf" if material.file_type == "pdf" else ".txt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
        
        try:
            # Check if document is large enough for multi-agent processing
            if material.file_type == 'pdf':
                from PyPDF2 import PdfReader
                reader = PdfReader(temp_path)
                page_count = len(reader.pages)
                
                print(f"\n📄 Document has {page_count} pages")
                
                if page_count > 30:  # Use multi-agent for documents > 30 pages
                    print(f"🚀 Using multi-agent processing (document has {page_count} pages)")
                    processor = MultiAgentProcessor(pages_per_chunk=50)
                    notes_data = await processor.process_document_parallel(
                        file_path=temp_path,
                        file_type=material.file_type
                    )
                else:
                    print(f"📝 Using single-agent processing (document has {page_count} pages)")
                    content = extract_pdf_text(temp_path)
                    notes_data = await openai_service.generate_smart_notes(content)
            else:
                # For non-PDF files, use single agent
                with open(temp_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                notes_data = await openai_service.generate_smart_notes(content)
            
            # Check if notes generation failed (returned error dict)
            if isinstance(notes_data, dict) and notes_data.get('summary', '').startswith('Error'):
                raise Exception(notes_data.get('summary'))
            
            # Save to Drive cache
            print(f"\n💾 Saving notes to Drive cache...")
            cache_manager.save_notes_cache(material_id, notes_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"❌ Error generating notes: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Notes generation failed: {str(e)}"
            )
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    # Create smart notes record in database
    smart_notes = SmartNotes(
        material_id=material_id,
        drive_file_id="cached",  # Placeholder since we're using Drive cache
        notes_data=notes_data
    )
    
    db.add(smart_notes)
    db.commit()
    db.refresh(smart_notes)
    
    print(f"✅ Notes generation complete for {material_id}\n")
    
    return SmartNotesResponse.from_orm(smart_notes)


@router.get("/{material_id}", response_model=SmartNotesResponse)
async def get_smart_notes(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get smart notes for a material
    
    Args:
        material_id: Material ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Smart notes data
    """
    # Verify material ownership
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Get notes
    notes = db.query(SmartNotes).filter(
        SmartNotes.material_id == material_id
    ).first()
    
    if not notes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Smart notes not found. Generate them first."
        )
    
    return SmartNotesResponse.from_orm(notes)


@router.get("/{material_id}/download")
async def download_notes(
    material_id: str,
    format: str = "docx",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download smart notes in specified format (docx)
    """
    # Verify material ownership
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == current_user.id
    ).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Get notes
    notes = db.query(SmartNotes).filter(
        SmartNotes.material_id == material_id
    ).first()
    
    if not notes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Smart notes not found"
        )
        
    if format == "docx":
        from app.utils.formatters import create_docx_from_notes
        from fastapi.responses import StreamingResponse
        
        # Generate DOCX
        file_stream = create_docx_from_notes(notes.notes_data, material.filename)
        
        filename = f"{os.path.splitext(material.filename)[0]}_notes.docx"
        
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Use 'docx'."
        )
