from openai import AsyncOpenAI
from app.config import settings
import json
from typing import List, Dict, Any


class OpenAIService:
    """Service for all OpenAI API interactions"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
    
    async def generate_summary(self, content: str, content_type: str = "text") -> str:
        """
        Generate a concise summary of learning material
        
        Args:
            content: The material content to summarize
            content_type: Type of content (text, pdf, image, audio)
            
        Returns:
            Summary string (approx 100 words)
        """
        messages = [
            {
                "role": "system",
                "content": "You are an expert academic tutor. Summarize learning materials clearly and concisely in about 100 words."
            },
            {
                "role": "user",
                "content": f"Summarize this {content_type} material:\n\n{content[:50000]}"
            }
        ]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=200
        )
        
        return response.choices[0].message.content
    
    async def generate_smart_notes(self, content: str) -> Dict[str, Any]:
        """
        Generate structured smart notes with JSON output
        
        Args:
            content: The material content
            
        Returns:
            Dictionary with summary, bulletPoints, detailedNotes, definitions, mindMap
        """
        messages = [
            {
                "role": "system",
                "content": """You are an expert educational AI. Analyze the study material and create comprehensive structured notes.
                
                Return a JSON object with:
                - summary: Executive summary (100-150 words)
                - bulletPoints: Array of 5-10 key takeaways
                - detailedNotes: Array of {heading, content} objects for main sections
                - definitions: Array of {term, definition} objects
                - mindMap: Array of {topic, subtopics[]} for conceptual hierarchy
                """
            },
            {
                "role": "user",
                "content": f"Create structured notes for:\n\n{content[:100000]}"
            }
        ]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=4000
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def generate_quiz(
        self, 
        content: str, 
        difficulty: str, 
        question_type: str = "multiple-choice",
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate quiz questions
        
        Args:
            content: The material content
            difficulty: Difficulty level (Easy, Medium, Hard)
            question_type: Type of questions (multiple-choice, short-answer, etc.)
            count: Number of questions to generate
            
        Returns:
            List of question dictionaries
        """
        messages = [
            {
                "role": "system",
                "content": f"""You are a professor creating {difficulty} difficulty exam questions.
                
                Generate {count} {question_type} questions based on the content.
                
                Return JSON object with "questions" array containing:
                - id: number
                - type: "{question_type}"
                - text: question text
                - options: array of 4 options (for MCQ)
                - correctAnswerIndex: number (for MCQ)
                - modelAnswer: detailed answer (for open-ended)
                - explanation: why the answer is correct
                - difficulty: "{difficulty}"
                """
            },
            {
                "role": "user",
                "content": f"Content:\n\n{content[:80000]}"
            }
        ]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=3000
        )
        
        response_content = response.choices[0].message.content.strip()
        
        # Clean up response if it contains markdown code blocks
        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.startswith("```"):
            response_content = response_content[3:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]
            
        result = json.loads(response_content.strip())
        return result.get("questions", [])
    
    async def evaluate_answer(
        self,
        question: str,
        user_answer: str,
        model_answer: str,
        max_marks: int
    ) -> Dict[str, Any]:
        """
        Evaluate student's answer with AI grading
        
        Args:
            question: The question text
            user_answer: Student's answer
            model_answer: Correct/model answer
            max_marks: Maximum marks for this question
            
        Returns:
            Dictionary with score and feedback
        """
        messages = [
            {
                "role": "system",
                "content": f"""You are a strict but fair academic grader.
                
                Evaluate the student's answer against the model answer.
                Assign a score out of {max_marks} based on:
                - Accuracy and correctness
                - Completeness
                - Clarity and organization
                
                Return JSON with:
                - score: number (0 to {max_marks})
                - feedback: detailed explanation of grading with comparison to model answer
                """
            },
            {
                "role": "user",
                "content": f"""Question: {question}

Model Answer: {model_answer}

Student Answer: {user_answer}

Evaluate and provide score with feedback."""
            }
        ]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=500
        )
        
        response_content = response.choices[0].message.content.strip()
        
        # Clean up response if it contains markdown code blocks
        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.startswith("```"):
            response_content = response_content[3:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]
            
        return json.loads(response_content.strip())
    
    async def chat_tutor(
        self,
        messages: List[Dict[str, str]],
        context: str = None
    ) -> str:
        """
        Interactive AI tutor chat
        
        Args:
            messages: List of chat messages with role and content
            context: Optional study material context
            
        Returns:
            AI response string
        """
        system_message = {
            "role": "system",
            "content": f"""You are a helpful AI tutor. Answer questions clearly and concisely.
            
            {f'Context from study material: {context[:50000]}' if context else 'No specific material context.'}
            
            If the question is about the study material, base your answer on the context.
            If not in the context, you can use general knowledge but mention that."""
        }
        
        full_messages = [system_message] + messages
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    async def strict_context_chat(
        self,
        messages: List[Dict[str, str]],
        context: str
    ) -> str:
        """
        Strict context-only chat (won't answer outside context)
        
        Args:
            messages: List of chat messages
            context: Study material context (required)
            
        Returns:
            AI response string
        """
        system_message = {
            "role": "system",
            "content": f"""You are a Strict Context Bot. You ONLY answer based on the provided context.
            
            Context: {context[:80000]}
            
            Rules:
            1. Only use information from the context above
            2. If the question cannot be answered from the context, say: "I cannot find this information in the provided notes."
            3. Do not use external knowledge
            4. Be concise and accurate"""
        }
        
        full_messages = [system_message] + messages
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=0.5,
            max_tokens=800
        )
        
        return response.choices[0].message.content
    
    async def process_image(self, image_url: str, prompt: str = None) -> str:
        """
        Process image with GPT-4 Vision
        
        Args:
            image_url: URL or base64 data URL of the image
            prompt: Optional custom prompt
            
        Returns:
            Image analysis text
        """
        default_prompt = "Analyze this educational image and extract all text, diagrams, and key concepts. Provide a detailed description."
        
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt or default_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ]
        
        response = await self.client.chat.completions.create(
            model="gpt-4o",  # Vision requires gpt-4o
            messages=messages,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
    
    async def transcribe_audio(self, audio_file_path: str) -> str:
        """
        Transcribe audio using Whisper API
        
        Args:
            audio_file_path: Path to audio file
            
        Returns:
            Transcribed text
        """
        with open(audio_file_path, "rb") as audio_file:
            transcript = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        return transcript


# Singleton instance
openai_service = OpenAIService()
