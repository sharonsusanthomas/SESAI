import sys
import os
from sqlalchemy import text

# Add module to path
sys.path.append(os.getcwd())

from app.database import engine

def update_schema_v2():
    print("🔄 Checking database schema for V2 update...")
    with engine.connect() as connection:
        # Check if 'content' exists
        result = connection.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'materials' "
            "AND COLUMN_NAME = 'content'"
        ))
        content_exists = result.scalar()
        
        # Check if 'content_file_id' exists
        result = connection.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'materials' "
            "AND COLUMN_NAME = 'content_file_id'"
        ))
        file_id_exists = result.scalar()
        
        try:
            if content_exists:
                print("➖ Removing 'content' column from 'materials' table...")
                connection.execute(text("ALTER TABLE materials DROP COLUMN content"))
                connection.commit()
            
            if not file_id_exists:
                print("➕ Adding 'content_file_id' column to 'materials' table...")
                connection.execute(text("ALTER TABLE materials ADD COLUMN content_file_id VARCHAR(255)"))
                connection.commit()
                print("✅ Schema updated successfully.")
            else:
                print("✅ Column 'content_file_id' already exists.")
                
        except Exception as e:
            print(f"❌ Failed to update schema: {e}")

if __name__ == "__main__":
    update_schema_v2()
