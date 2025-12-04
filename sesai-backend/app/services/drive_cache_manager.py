from app.services.google_drive import GoogleDriveService
from google.oauth2.credentials import Credentials
import json
from typing import Optional, Dict, Any
from datetime import datetime


class DriveCacheManager:
    """
    Service to manage caching of notes and quiz results in Google Drive
    Prevents regeneration of already processed content
    """
    
    def __init__(self, drive_service: GoogleDriveService, folder_ids: Dict[str, str]):
        """
        Initialize the cache manager
        
        Args:
            drive_service: GoogleDriveService instance
            folder_ids: Dictionary with folder IDs (smart_notes, quizzes, etc.)
        """
        self.drive = drive_service
        self.notes_folder = folder_ids.get('smart_notes')
        self.quiz_folder = folder_ids.get('quizzes')
        self.metadata_folder = folder_ids.get('metadata')
    
    def check_notes_cache(self, material_id: str) -> Optional[Dict[str, Any]]:
        """
        Check if notes exist in Drive cache
        
        Args:
            material_id: ID of the material
            
        Returns:
            Cached notes if found, None otherwise
        """
        filename = f"{material_id}_notes.json"
        
        try:
            # Search for file in notes folder
            files = self.drive.list_files(self.notes_folder)
            cached_file = next((f for f in files if f['name'] == filename), None)
            
            if cached_file:
                print(f"✅ Cache HIT: Found cached notes for material {material_id}")
                # Download and parse
                content = self.drive.download_json(cached_file['id'])
                return content
            
            print(f"ℹ️ Cache MISS: No cached notes for material {material_id}")
            return None
            
        except Exception as e:
            print(f"❌ Cache check failed: {str(e)}")
            return None
    
    def save_notes_cache(self, material_id: str, notes: Dict[str, Any]) -> bool:
        """
        Save notes to Drive cache
        
        Args:
            material_id: ID of the material
            notes: Notes data to cache
            
        Returns:
            True if successful, False otherwise
        """
        filename = f"{material_id}_notes.json"
        
        try:
            # Add metadata
            cache_data = {
                "material_id": material_id,
                "cached_at": datetime.utcnow().isoformat(),
                "notes": notes
            }
            
            self.drive.upload_json(
                data=cache_data,
                filename=filename,
                parent_id=self.notes_folder
            )
            
            print(f"💾 Saved notes cache for material {material_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save notes cache: {str(e)}")
            return False
    
    def check_quiz_cache(self, quiz_id: str) -> Optional[Dict[str, Any]]:
        """
        Check if quiz result exists in Drive
        
        Args:
            quiz_id: ID of the quiz
            
        Returns:
            Cached quiz result if found, None otherwise
        """
        filename = f"{quiz_id}_result.json"
        
        try:
            files = self.drive.list_files(self.quiz_folder)
            cached_file = next((f for f in files if f['name'] == filename), None)
            
            if cached_file:
                print(f"✅ Found cached quiz result {quiz_id}")
                content = self.drive.download_json(cached_file['id'])
                return content
            
            return None
            
        except Exception as e:
            print(f"❌ Quiz cache check failed: {str(e)}")
            return None
    
    def save_quiz_result(self, quiz_id: str, result: Dict[str, Any]) -> bool:
        """
        Save quiz result to Drive
        
        Args:
            quiz_id: ID of the quiz
            result: Quiz result data
            
        Returns:
            True if successful, False otherwise
        """
        filename = f"{quiz_id}_result.json"
        
        try:
            # Add metadata
            cache_data = {
                "quiz_id": quiz_id,
                "saved_at": datetime.utcnow().isoformat(),
                "result": result
            }
            
            self.drive.upload_json(
                data=cache_data,
                filename=filename,
                parent_id=self.quiz_folder
            )
            
            print(f"💾 Saved quiz result {quiz_id} to Drive")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save quiz result: {str(e)}")
            return False
    
    def save_processing_metadata(self, material_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Save processing metadata (chunk info, processing time, etc.)
        
        Args:
            material_id: ID of the material
            metadata: Metadata to save
            
        Returns:
            True if successful, False otherwise
        """
        filename = f"{material_id}_metadata.json"
        
        try:
            metadata_with_timestamp = {
                "material_id": material_id,
                "created_at": datetime.utcnow().isoformat(),
                **metadata
            }
            
            self.drive.upload_json(
                data=metadata_with_timestamp,
                filename=filename,
                parent_id=self.metadata_folder
            )
            
            print(f"💾 Saved processing metadata for material {material_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to save metadata: {str(e)}")
            return False
    
    def invalidate_notes_cache(self, material_id: str) -> bool:
        """
        Delete cached notes (useful if material is updated)
        
        Args:
            material_id: ID of the material
            
        Returns:
            True if successful, False otherwise
        """
        filename = f"{material_id}_notes.json"
        
        try:
            files = self.drive.list_files(self.notes_folder)
            cached_file = next((f for f in files if f['name'] == filename), None)
            
            if cached_file:
                self.drive.delete_file(cached_file['id'])
                print(f"🗑️ Invalidated notes cache for material {material_id}")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ Failed to invalidate cache: {str(e)}")
            return False
