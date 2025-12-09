import asyncio
from typing import List
from app.services.document_chunker import DocumentChunker, ChunkInfo
from app.services.openai_service import openai_service


class MultiAgentProcessor:
    """
    Service to process large documents using multiple AI agents in parallel
    Each agent processes a chunk of the document independently
    """
    
    def __init__(self, pages_per_chunk: int = 15):
        """
        Initialize the multi-agent processor
        
        Args:
            pages_per_chunk: Number of pages each agent should process
        """
        self.chunker = DocumentChunker(pages_per_chunk=pages_per_chunk)
    
    async def process_document_parallel(
        self, 
        file_path: str = None,
        file_type: str = "pdf",
        json_content: List[dict] = None
    ) -> dict:
        """
        Process a document using multiple AI agents in parallel
        
        Args:
            file_path: Path to the document file (optional if json_content provided)
            file_type: Type of file (pdf, text, etc.)
            json_content: Pre-extracted page content [{"page": 1, "text": "..."}]
            
        Returns:
            Merged notes from all agents
        """
        print(f"\n🚀 Starting multi-agent processing...")
        
        # Step 1: Chunk the document
        if json_content:
            chunks = self.chunker.chunk_json_content(json_content)
        elif file_path:
            chunks = self.chunker.chunk_pdf(file_path)
        else:
            raise ValueError("Either file_path or json_content must be provided")
        
        if len(chunks) == 0:
            raise ValueError("No chunks created from document")
        
        print(f"\n🤖 Deploying {len(chunks)} AI agents for parallel processing...")
        
        # Step 2: Process chunks in parallel
        tasks = []
        for chunk in chunks:
            task = self._process_chunk(chunk, file_type)
            tasks.append(task)
        
        # Execute all tasks concurrently
        chunk_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out any exceptions
        valid_results = []
        for i, result in enumerate(chunk_results):
            if isinstance(result, Exception):
                print(f"❌ Agent {i + 1} failed: {str(result)}")
            else:
                valid_results.append(result)
        
        if len(valid_results) == 0:
            raise ValueError("All agents failed to process chunks")
        
        print(f"\n✅ {len(valid_results)}/{len(chunks)} agents completed successfully")
        
        # Step 3: Merge results
        print("\n🔄 Merging results from all agents...")
        merged_notes = self.chunker.merge_notes(valid_results)
        
        print("✅ Multi-agent processing complete!\n")
        
        return merged_notes
    
    async def _process_chunk(self, chunk: ChunkInfo, file_type: str) -> dict:
        """
        Process a single chunk with an AI agent
        
        Args:
            chunk: ChunkInfo object containing chunk data
            file_type: Type of file being processed
            
        Returns:
            Notes generated for this chunk
        """
        agent_id = chunk.chunk_id + 1
        print(f"🤖 Agent {agent_id} starting: Pages {chunk.start_page}-{chunk.end_page}")
        
        try:
            # Add context to help AI understand this is part of a larger document
            context = f"This is section {agent_id} (pages {chunk.start_page}-{chunk.end_page}) of a larger document. Generate comprehensive notes for this section."
            
            # Call OpenAI to generate notes for this chunk
            # Prepend context to content so AI knows it's a section
            full_content = f"CONTEXT: {context}\n\nCONTENT:\n{chunk.content}"
            notes = await openai_service.generate_smart_notes(full_content)
            
            print(f"✅ Agent {agent_id} completed: Pages {chunk.start_page}-{chunk.end_page}")
            
            return notes
            
        except Exception as e:
            print(f"❌ Agent {agent_id} failed: {str(e)}")
            raise
