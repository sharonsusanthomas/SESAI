import google.generativeai as genai
from app.config import settings
from typing import Dict, Any
import json

# Lazy initialization
_gemini_service_instance = None

def get_gemini_service():
    global _gemini_service_instance
    if _gemini_service_instance is None:
        _gemini_service_instance = GeminiService()
    return _gemini_service_instance

class GeminiService:
    """Service for Google Gemini AI interactions - Focused on Notes Generation"""
    
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            # We don't raise error here to allow app to start if key is missing,
            # but methods will fail if called.
            print("⚠️ GEMINI_API_KEY not found. Gemini features will not work.")
            self.model = None
            return
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        print("✅ Gemini AI service initialized (Notes Only) - Using gemini-pro")
    
    async def generate_smart_notes(self, content: str, file_type: str = "text") -> Dict[str, Any]:
        """
        Generate comprehensive smart notes from content using Gemini
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        if not content or len(content.strip()) < 50:
            return {
                "summary": "No study material was provided or content is too short.",
                "bulletPoints": [],
                "detailedNotes": [],
                "definitions": [],
                "mindMap": []
            }
        
        prompt = f"""You are an expert educational assistant. Analyze this content and create comprehensive study notes.

Content:
{content}

Generate detailed study notes in the following JSON format:
{{
  "summary": "A comprehensive 3-4 sentence summary of the entire content",
  "bulletPoints": ["Key point 1", "Key point 2", ...],
  "detailedNotes": [
    {{"heading": "Topic 1", "content": "Detailed explanation..."}},
    {{"heading": "Topic 2", "content": "Detailed explanation..."}}
  ],
  "definitions": [
    {{"term": "Term 1", "definition": "Definition..."}},
    {{"term": "Term 2", "definition": "Definition..."}}
  ],
  "mindMap": [
    {{"topic": "Main Topic 1", "subtopics": ["Subtopic 1", "Subtopic 2"]}},
    {{"topic": "Main Topic 2", "subtopics": ["Subtopic 1", "Subtopic 2"]}}
  ]
}}

Return ONLY valid JSON, no additional text."""
        
        try:
            response = self.model.generate_content(prompt)
            
            # Check for safety blocks or empty responses
            if not response.parts:
                print(f"⚠️ Gemini response blocked or empty. Feedback: {response.prompt_feedback}")
                raise ValueError(f"Content generation blocked by safety filters: {response.prompt_feedback}")
                
            result_text = response.text.strip()
            
            # Clean up response
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            notes = json.loads(result_text.strip())
            return notes
            
        except Exception as e:
            print(f"❌ Gemini notes error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "summary": f"Error generating notes: {str(e)}",
                "bulletPoints": [],
                "detailedNotes": [],
                "definitions": [],
                "mindMap": []
            }

# Singleton accessor
gemini_service = type('LazyGeminiService', (), {
    '__getattr__': lambda self, name: getattr(get_gemini_service(), name)
})()
