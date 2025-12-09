from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MaterialBase(BaseModel):
    """Base material schema"""
    filename: str
    file_type: str


class MaterialCreate(MaterialBase):
    """Schema for creating a material"""
    drive_file_id: str
    summary: Optional[str] = None
    drive_link: Optional[str] = None


class MaterialResponse(MaterialBase):
    """Schema for material response"""
    id: str
    user_id: str
    drive_file_id: str
    summary: Optional[str] = None
    drive_link: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MaterialDetailResponse(MaterialResponse):
    """Schema for detailed material response including content"""
    content: Optional[str] = None


class MaterialListResponse(BaseModel):
    """Schema for list of materials"""
    materials: list[MaterialResponse]
    total: int
