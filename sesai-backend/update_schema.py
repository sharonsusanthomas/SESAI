import sys
import os
from sqlalchemy import text

# Add module to path
sys.path.append(os.getcwd())

from app.database import engine

def update_schema():
    print("🔄 Checking database schema...")
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'materials' "
            "AND COLUMN_NAME = 'content'"
        ))
        exists = result.scalar()
        
        if not exists:
            print("➕ Adding 'content' column to 'materials' table...")
            try:
                connection.execute(text("ALTER TABLE materials ADD COLUMN content LONGTEXT"))
                connection.commit()
                print("✅ Schema updated successfully.")
            except Exception as e:
                print(f"❌ Failed to update schema: {e}")
        else:
            print("✅ Column 'content' already exists.")

if __name__ == "__main__":
    update_schema()
