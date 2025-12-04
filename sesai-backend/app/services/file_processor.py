import PyPDF2
from PIL import Image
import io
from typing import Tuple


def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from PDF file
    
    Args:
        file_path: Path to PDF file
        
    Returns:
        Extracted text
    """
    text = ""
    
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {str(e)}")
    
    return text.strip()


def process_image(file_path: str) -> Tuple[str, bytes]:
    """
    Process and validate image file
    
    Args:
        file_path: Path to image file
        
    Returns:
        Tuple of (mime_type, image_bytes)
    """
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Get image bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG')
            img_bytes = img_byte_arr.getvalue()
            
            return 'image/jpeg', img_bytes
    
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")


def validate_file_type(filename: str, allowed_extensions: list) -> bool:
    """
    Validate file extension
    
    Args:
        filename: Name of the file
        allowed_extensions: List of allowed extensions (e.g., ['.pdf', '.jpg'])
        
    Returns:
        True if valid
    """
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)


def get_file_type(filename: str) -> str:
    """
    Determine file type from filename
    
    Args:
        filename: Name of the file
        
    Returns:
        File type string (text, pdf, image, audio)
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith(('.pdf',)):
        return 'pdf'
    elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
        return 'image'
    elif filename_lower.endswith(('.mp3', '.wav', '.m4a', '.ogg')):
        return 'audio'
    elif filename_lower.endswith(('.txt', '.md', '.json')):
        return 'text'
    else:
        return 'text'  # Default to text
