import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { LearningMaterial } from '../types';
import { generateSummary } from '../services/geminiService';

interface FileUploadProps {
  onUploadComplete: (material: LearningMaterial) => void;
}

// Declare pdfjsLib generic to avoid TS errors without installing types for the CDN script
declare const pdfjsLib: any;

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      
      // Removed the 50-page limit as requested. 
      // Note: Very large PDFs might take some time to process.
      const maxPages = pdf.numPages; 
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    } catch (e) {
      console.error("PDF Parse Error", e);
      throw new Error("Failed to read PDF text.");
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      let content = '';
      let type: 'text' | 'image' | 'pdf' = 'text';

      if (file.type.startsWith('image/')) {
        type = 'image';
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
        const arrayBuffer = await file.arrayBuffer();
        content = await extractTextFromPDF(arrayBuffer);
        if (content.trim().length === 0) {
            throw new Error("PDF appears empty or is image-based (OCR not supported in this version).");
        }
      } else {
        // Assume text for everything else
        try {
            content = await file.text();
            type = 'text';
        } catch (readError) {
             alert("Could not read file text.");
             setIsProcessing(false);
             return;
        }
      }

      // Create initial material object
      const newMaterial: LearningMaterial = {
        id: crypto.randomUUID(),
        title: file.name,
        type: type as any,
        content: content,
        processedDate: new Date().toISOString(),
        tags: ['New'],
        summary: '' // To be filled by AI
      };

      // Generate Summary Immediately
      try {
        const summary = await generateSummary(content, type as any);
        newMaterial.summary = summary;
      } catch (err) {
        console.error("Auto-summary failed", err);
        newMaterial.summary = "Summary generation failed. Check API Key or Try manual regeneration.";
      }

      onUploadComplete(newMaterial);
    } catch (error: any) {
      console.error(error);
      alert(`Error processing file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        processFile(e.target.files[0]);
        e.target.value = '';
    }
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileInput}
        accept=".txt,.md,.json,.pdf,image/*"
      />
      
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-sm text-gray-600">Processing file...</p>
        </div>
      ) : (
        <>
          <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
            <UploadCloud className="text-blue-600" size={24} />
          </div>
          <h3 className="font-semibold text-gray-900">Click to upload or drag and drop</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Supported: PDF, Text, Markdown, Images</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><FileText size={12}/> Docs</span>
            <span className="flex items-center gap-1"><ImageIcon size={12}/> Images</span>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUpload;