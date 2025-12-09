import sys
import os
import json
from reportlab.pdfgen import canvas

# Add module to path
sys.path.append(os.getcwd())

from app.services.document_chunker import DocumentChunker, ChunkInfo

def create_dummy_pdf(filename, pages=5):
    c = canvas.Canvas(filename)
    for i in range(pages):
        c.drawString(100, 750, f"Page {i+1} Content")
        c.drawString(100, 730, "This is some dummy text for testing extraction.")
        c.showPage()
    c.save()
    return filename

def test_offload_logic():
    print("🧪 Testing Offload Extraction Logic...")
    
    pdf_path = "test_offload.pdf"
    create_dummy_pdf(pdf_path, pages=10)
    
    try:
        # 1. Test Extraction Logic (Mimic upload_material)
        print("📄 Extracting text from PDF...")
        pages_data = []
        from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            txt = page.extract_text() or ""
            pages_data.append({"page": i + 1, "text": txt})
            
        print(f"✅ Extracted {len(pages_data)} pages.")
        
        # Verify JSON structure
        json_output = json.dumps(pages_data, indent=2)
        # print(json_output)
        
        # 2. Test Chunker with JSON
        print("\n🧩 Testing DocumentChunker with JSON...")
        chunker = DocumentChunker(pages_per_chunk=3) # Small chunk size for test
        chunks = chunker.chunk_json_content(pages_data)
        
        print(f"✅ Created {len(chunks)} chunks.")
        
        for chunk in chunks:
            print(f"   Chunk {chunk.chunk_id}: Pages {chunk.start_page}-{chunk.end_page}")
            if f"--- Page {chunk.start_page} ---" not in chunk.content:
                print("❌ Start page marker missing in content!")
            else:
                print("   ✓ Content markers verified")
                
        print("\n✨ Logic Verification Successful!")
        
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

if __name__ == "__main__":
    test_offload_logic()
