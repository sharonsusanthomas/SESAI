from PyPDF2 import PdfReader
from typing import List
from dataclasses import dataclass


@dataclass
class ChunkInfo:
    """Information about a document chunk"""
    chunk_id: int
    start_page: int
    end_page: int
    content: str
    page_count: int


class DocumentChunker:
    """Service to split large documents into chunks for parallel processing"""
    
    def __init__(self, pages_per_chunk: int = 50):
        """
        Initialize the document chunker
        
        Args:
            pages_per_chunk: Number of pages per chunk (default: 50)
        """
        self.pages_per_chunk = pages_per_chunk
    
    def chunk_pdf(self, file_path: str) -> List[ChunkInfo]:
        """
        Split PDF into chunks of specified page size
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            List of ChunkInfo objects containing chunk metadata and content
        """
        try:
            reader = PdfReader(file_path)
            total_pages = len(reader.pages)
            chunks = []
            
            print(f"📄 Processing PDF with {total_pages} pages")
            print(f"📊 Creating chunks of {self.pages_per_chunk} pages each")
            
            for i in range(0, total_pages, self.pages_per_chunk):
                start = i
                end = min(i + self.pages_per_chunk, total_pages)
                
                # Extract text from page range
                content = self._extract_page_range_text(reader, start, end)
                
                chunk = ChunkInfo(
                    chunk_id=len(chunks),
                    start_page=start + 1,  # 1-indexed for user display
                    end_page=end,
                    content=content,
                    page_count=end - start
                )
                
                chunks.append(chunk)
                print(f"  ✓ Chunk {chunk.chunk_id}: Pages {chunk.start_page}-{chunk.end_page} ({chunk.page_count} pages, {len(content)} chars)")
            
            print(f"✅ Created {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            print(f"❌ Error chunking PDF: {str(e)}")
            raise
    
    def _extract_page_range_text(self, reader: PdfReader, start: int, end: int) -> str:
        """
        Extract text from a specific page range
        
        Args:
            reader: PdfReader instance
            start: Start page index (0-indexed)
            end: End page index (exclusive)
            
        Returns:
            Extracted text content
        """
        text = ""
        for i in range(start, end):
            try:
                page_text = reader.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n\n"
            except Exception as e:
                print(f"⚠️ Warning: Could not extract text from page {i + 1}: {str(e)}")
                continue
        
        return text.strip()
    
    def merge_notes(self, chunk_notes: List[dict]) -> dict:
        """
        Merge notes from multiple chunks into a single comprehensive note
        
        Args:
            chunk_notes: List of notes dictionaries from each chunk
            
        Returns:
            Merged notes dictionary
        """
        merged = {
            "summary": "",
            "bulletPoints": [],
            "detailedNotes": [],
            "definitions": [],
            "mindMap": []
        }
        
        # Combine summaries with chunk context
        summaries = []
        for i, notes in enumerate(chunk_notes):
            if notes.get("summary"):
                summaries.append(f"[Section {i + 1}] {notes['summary']}")
        
        merged["summary"] = " ".join(summaries)
        
        # Merge all other fields
        for i, notes in enumerate(chunk_notes):
            # Add bullet points with section markers
            for point in notes.get("bulletPoints", []):
                merged["bulletPoints"].append(f"[Sec {i + 1}] {point}")
            
            # Add detailed notes
            for note in notes.get("detailedNotes", []):
                merged["detailedNotes"].append({
                    "heading": f"[Section {i + 1}] {note.get('heading', '')}",
                    "content": note.get("content", "")
                })
            
            # Add definitions (deduplicate by term)
            existing_terms = {d["term"] for d in merged["definitions"]}
            for definition in notes.get("definitions", []):
                if definition.get("term") not in existing_terms:
                    merged["definitions"].append(definition)
                    existing_terms.add(definition["term"])
            
            # Add mind map topics
            for topic in notes.get("mindMap", []):
                merged["mindMap"].append({
                    "topic": f"[Sec {i + 1}] {topic.get('topic', '')}",
                    "subtopics": topic.get("subtopics", [])
                })
        
        print(f"📝 Merged notes: {len(merged['bulletPoints'])} points, {len(merged['detailedNotes'])} sections, {len(merged['definitions'])} definitions")
        
        return merged
