from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload, MediaInMemoryUpload
from google.oauth2.credentials import Credentials
import io
import json
from typing import List, Dict, Any, Optional


class GoogleDriveService:
    """Service for Google Drive API interactions"""
    
    def __init__(self, credentials: Credentials):
        """
        Initialize Drive service with user credentials
        
        Args:
            credentials: Google OAuth2 credentials
        """
        self.service = build('drive', 'v3', credentials=credentials)
    
    def get_or_create_folder(self, folder_name: str, parent_id: Optional[str] = None) -> str:
        """
        Get existing folder or create new one
        
        Args:
            folder_name: Name of the folder
            parent_id: Optional parent folder ID
            
        Returns:
            Folder ID
        """
        # Search for existing folder
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_id:
            query += f" and '{parent_id}' in parents"
        
        results = self.service.files().list(
            q=query,
            fields="files(id, name)",
            spaces='drive'
        ).execute()
        
        folders = results.get('files', [])
        
        if folders:
            return folders[0]['id']
        
        # Create folder if it doesn't exist
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        if parent_id:
            file_metadata['parents'] = [parent_id]
        
        folder = self.service.files().create(
            body=file_metadata,
            fields='id'
        ).execute()
        
        return folder['id']
    
    def validate_folder(self, folder_id: str) -> bool:
        """
        Check if a folder exists and is accessible
        """
        try:
            file = self.service.files().get(
                fileId=folder_id,
                fields='id, trashed'
            ).execute()
            return not file.get('trashed', False)
        except Exception:
            return False

    def upload_file(
        self, 
        file_path: str, 
        filename: str, 
        parent_id: str,
        mime_type: str = None
    ) -> Dict[str, str]:
        """
        Upload file to Drive
        
        Args:
            file_path: Local path to file
            filename: Name for the file in Drive
            parent_id: Parent folder ID
            mime_type: Optional MIME type
            
        Returns:
            Dictionary with file ID and links
        """
        file_metadata = {
            'name': filename,
            'parents': [parent_id]
        }
        
        # Use simple upload instead of resumable for better reliability with small files
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=False)
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink, webContentLink'
        ).execute()
        
        return {
            'id': file['id'],
            'webViewLink': file.get('webViewLink'),
            'webContentLink': file.get('webContentLink')
        }
    
    def upload_json(
        self,
        data: Dict[str, Any],
        filename: str,
        parent_id: str
    ) -> Dict[str, str]:
        """
        Upload JSON data to Drive
        
        Args:
            data: Dictionary to upload as JSON
            filename: Name for the file
            parent_id: Parent folder ID
            
        Returns:
            Dictionary with file ID and links
        """
        file_metadata = {
            'name': filename,
            'parents': [parent_id],
            'mimeType': 'application/json'
        }
        
        json_string = json.dumps(data, ensure_ascii=False, indent=2)
        media = MediaInMemoryUpload(
            json_string.encode('utf-8'),
            mimetype='application/json',
            resumable=True
        )
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        
        return {
            'id': file['id'],
            'webViewLink': file.get('webViewLink')
        }
    
    def download_file(self, file_id: str) -> bytes:
        """
        Download file from Drive
        
        Args:
            file_id: Google Drive file ID
            
        Returns:
            File content as bytes
        """
        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        return fh.read()
    
    def download_json(self, file_id: str) -> Dict[str, Any]:
        """
        Download and parse JSON file from Drive
        
        Args:
            file_id: Google Drive file ID
            
        Returns:
            Parsed JSON data
        """
        content = self.download_file(file_id)
        return json.loads(content.decode('utf-8'))
    
    def list_files(self, folder_id: str) -> List[Dict[str, Any]]:
        """
        List all files in folder
        
        Args:
            folder_id: Folder ID to list
            
        Returns:
            List of file metadata dictionaries
        """
        results = self.service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="files(id, name, createdTime, modifiedTime, size, mimeType, webViewLink)",
            orderBy='createdTime desc'
        ).execute()
        
        return results.get('files', [])
    
    def delete_file(self, file_id: str) -> None:
        """
        Delete file from Drive
        
        Args:
            file_id: File ID to delete
        """
        self.service.files().delete(fileId=file_id).execute()
    
    def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """
        Get file metadata
        
        Args:
            file_id: File ID
            
        Returns:
            File metadata dictionary
        """
        return self.service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size, createdTime, modifiedTime, webViewLink'
        ).execute()
    
    def setup_sesai_folder_structure(self) -> Dict[str, str]:
        """
        Create SESAI folder structure in user's Drive
        
        Returns:
            Dictionary with folder IDs
        """
        # Create main SESAI folder
        sesai_folder_id = self.get_or_create_folder("SESAI")
        
        # Create subfolders
        uploads_folder_id = self.get_or_create_folder("uploads", sesai_folder_id)
        notes_folder_id = self.get_or_create_folder("smart_notes", sesai_folder_id)
        quizzes_folder_id = self.get_or_create_folder("quizzes", sesai_folder_id)
        metadata_folder_id = self.get_or_create_folder("metadata", sesai_folder_id)
        
        return {
            'sesai': sesai_folder_id,
            'uploads': uploads_folder_id,
            'smart_notes': notes_folder_id,
            'quizzes': quizzes_folder_id,
            'metadata': metadata_folder_id
        }
