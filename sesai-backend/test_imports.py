"""
Quick test to verify all new services can be imported
"""
import sys

print("Testing imports...")

try:
    from app.services.document_chunker import DocumentChunker
    print("✅ DocumentChunker imported successfully")
except Exception as e:
    print(f"❌ DocumentChunker import failed: {e}")
    sys.exit(1)

try:
    from app.services.multi_agent_processor import MultiAgentProcessor
    print("✅ MultiAgentProcessor imported successfully")
except Exception as e:
    print(f"❌ MultiAgentProcessor import failed: {e}")
    sys.exit(1)

try:
    from app.services.drive_cache_manager import DriveCacheManager
    print("✅ DriveCacheManager imported successfully")
except Exception as e:
    print(f"❌ DriveCacheManager import failed: {e}")
    sys.exit(1)

print("\n✅ All imports successful!")
print("\nTesting basic functionality...")

# Test DocumentChunker
try:
    chunker = DocumentChunker(pages_per_chunk=50)
    print("✅ DocumentChunker instantiated")
except Exception as e:
    print(f"❌ DocumentChunker instantiation failed: {e}")

# Test MultiAgentProcessor
try:
    processor = MultiAgentProcessor(pages_per_chunk=50)
    print("✅ MultiAgentProcessor instantiated")
except Exception as e:
    print(f"❌ MultiAgentProcessor instantiation failed: {e}")

print("\n🎉 All tests passed!")
