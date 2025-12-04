from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime


class SmartNotesData(BaseModel):
    """Schema for smart notes data structure"""
    summary: str
    bulletPoints: List[str]
    detailedNotes: List[Dict[str, str]]
    definitions: List[Dict[str, str]]
    mindMap: List[Dict[str, Any]]


class SmartNotesResponse(BaseModel):
    """Schema for smart notes response"""
    id: str
    material_id: str
    drive_file_id: str
    notes_data: SmartNotesData
    created_at: datetime
    
    class Config:
        from_attributes = True


class GenerateNotesRequest(BaseModel):
    """Schema for generating notes request"""
    material_id: str
