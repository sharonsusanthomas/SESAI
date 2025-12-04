import os
from dotenv import load_dotenv
import google.generativeai as genai
import asyncio

# Load environment variables
load_dotenv()

async def test_gemini():
    print("🧪 Testing Gemini API Configuration...")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env file")
        return
    
    print(f"✅ Found API Key: {api_key[:5]}...{api_key[-5:]}")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        print("\n📤 Sending test request to Gemini...")
        response = model.generate_content("Hello, are you working? Reply with 'Yes, I am working!'")
        
        print(f"\n✅ Response received: {response.text}")
        print("\n🎉 Gemini API is working correctly!")
        
    except Exception as e:
        print(f"\n❌ Gemini API Error: {str(e)}")
        print("\nPossible causes:")
        print("1. Invalid API Key")
        print("2. API Quota exceeded")
        print("3. Network connectivity issues")

if __name__ == "__main__":
    asyncio.run(test_gemini())
