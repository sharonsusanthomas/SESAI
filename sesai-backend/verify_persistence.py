import sys
import os
import requests
import tempfile

# Add module to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import create_access_token

def verify_persistence():
    print("🧪 Starting Persistence Verification...")
    
    # 1. Get User & Token
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        print("❌ No user found.")
        return
        
    token = create_access_token(data={"sub": user.id})
    headers = {"Authorization": f"Bearer {token}"}
    print(f"👤 Authenticated as: {user.email}")
    
    # 2. Create Dummy File
    content = "This is a test content that should be persisted to the database."
    
    # Mock Drive Upload (if possible) or just expect failure if credentials missing
    # Since we can't easily mock the drive service here without extensive mocking,
    # we might hit an error if the user doesn't have valid Google tokens.
    # However, the user state implies they have been working on the app.
    
    # Let's try to upload. If 401/500 from Drive, we check if it failed BEFORE saving to DB.
    # The code uploads to drive first.
    
    # If we can't do a real upload, we can check a known material if one exists?
    # No, we need to test the NEW upload logic.
    
    files = {
        'file': ('test_persist.txt', content, 'text/plain')
    }
    
    print("\n📤 Uploading test file...")
    try:
        resp = requests.post(
            "http://localhost:8000/api/materials/upload",
            headers=headers,
            files=files
        )
        
        if resp.status_code != 200:
            print(f"⚠️ Upload failed (Status {resp.status_code}): {resp.text}")
            print("This might be due to missing/expired Google Tokens in the DB.")
            return

        material_id = resp.json()['id']
        print(f"✅ Upload success. Material ID: {material_id}")
        
        # 3. Verify Response Content
        # The upload response MIGHT NOT include content if it returns MaterialResponse?
        # Let's check the schema. MaterialResponse does NOT have content.
        # So we must call GET /api/materials/{id}
        
        print("\n🔍 Fetching material details...")
        get_resp = requests.get(
            f"http://localhost:8000/api/materials/{material_id}",
            headers=headers
        )
        
        if get_resp.status_code == 200:
            data = get_resp.json()
            saved_content = data.get('content')
            if saved_content == content:
                print(f"✅ SUCCESS! Content persisted and returned correctly.")
                print(f"   Original: '{content}'")
                print(f"   Returned: '{saved_content}'")
                
                # Cleanup
                requests.delete(f"http://localhost:8000/api/materials/{material_id}", headers=headers)
                print("🧹 Test material deleted.")
            else:
                print(f"❌ Verification Failed.")
                print(f"   Expected: '{content}'")
                print(f"   Got: '{saved_content}'")
        else:
             print(f"❌ Failed to get material (Status {get_resp.status_code})")
             
    except Exception as e:
        print(f"❌ Test Exception: {e}")

if __name__ == "__main__":
    verify_persistence()
