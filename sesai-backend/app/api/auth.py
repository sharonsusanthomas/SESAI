from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.database import get_db
from app.models.user import User
from app.models.analytics import UserSettings
from app.schemas.user import UserResponse, TokenResponse
from app.utils.security import create_access_token
from app.utils.dependencies import get_current_user
from app.config import settings
from app.services.google_drive import GoogleDriveService
from datetime import datetime

router = APIRouter()

# Google OAuth scopes
SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.file',
    'openid'
]


@router.get("/google")
async def google_login():
    """
    Initiate Google OAuth flow
    
    Returns:
        Redirect to Google OAuth consent screen
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {"auth_url": authorization_url, "state": state}


@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """
    Handle Google OAuth callback
    """
    try:
        # Exchange code for credentials
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info from Google
        user_info_service = build('oauth2', 'v2', credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        
        google_id = user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        
        # Check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if not user:
            # Create new user
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture_url=picture,
                google_access_token=credentials.token,
                google_refresh_token=credentials.refresh_token,
                token_expiry=credentials.expiry
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create default settings
            settings_obj = UserSettings(user_id=user.id)
            db.add(settings_obj)
            
            # Setup Google Drive folder structure
            try:
                drive_service = GoogleDriveService(credentials)
                folders = drive_service.setup_sesai_folder_structure()
                user.drive_folder_id = folders['sesai']
            except Exception as e:
                print(f"❌ Failed to create Drive folders: {str(e)}")
                user.drive_folder_id = None
            
            db.commit()
            db.refresh(user)
        else:
            # Update last login and tokens
            user.last_login = datetime.utcnow()
            user.google_access_token = credentials.token
            if credentials.refresh_token:
                user.google_refresh_token = credentials.refresh_token
            user.token_expiry = credentials.expiry
            
            # Retry Drive folder creation if missing
            if not user.drive_folder_id:
                try:
                    drive_service = GoogleDriveService(credentials)
                    folders = drive_service.setup_sesai_folder_structure()
                    user.drive_folder_id = folders['sesai']
                except Exception as e:
                    print(f"❌ Failed to create Drive folders on login retry: {str(e)}")
            
            db.commit()
            db.refresh(user)
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user.id})
        
        # Return token and user data
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        print(f"❌ Auth Callback Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user
    
    Args:
        current_user: Current user from JWT token
        
    Returns:
        User data
    """
    return UserResponse.from_orm(current_user)


@router.post("/logout")
async def logout():
    """
    Logout endpoint (client should delete token)
    
    Returns:
        Success message
    """
    return {"message": "Logged out successfully"}
