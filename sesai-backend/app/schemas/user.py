from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    google_id: str
    picture_url: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: str
    google_id: str
    picture_url: Optional[str] = None
    drive_folder_id: Optional[str] = None
    created_at: datetime
    last_login: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
