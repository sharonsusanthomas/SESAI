import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Loader2, Clipboard, Type } from 'lucide-react';
import { LearningMaterial } from '../types';
import { generateSummary } from '../services/geminiService';

interface FileUploadProps {
  onUploadComplete: (material: LearningMaterial) => void;
}

// Declare pdfjsLib generic to avoid TS errors without installing types for the CDN script
declare const pdfjsLib: any;

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Paste Mode State
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedContent, setPastedContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';

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
        try {
          content = await file.text();
          type = 'text';
        } catch (readError) {
          alert("Could not read file text.");
          setIsProcessing(false);
          return;
        }
      }

      const newMaterial: LearningMaterial = {
        id: window.crypto?.randomUUID?.() || Math.random().toString(36).substring(2),
        title: file.name,
        type: type as any,
        content,
        processedDate: new Date().toISOString(),
        tags: ['New'],
        summary: ''
      };

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

  const handlePasteSubmit = async () => {
    if (!pastedTitle.trim() || !pastedContent.trim()) {
      alert("Please enter both a title and content.");
      return;
    }

    setIsProcessing(true);
    try {
      const newMaterial: LearningMaterial = {
        id: window.crypto?.randomUUID?.() || Math.random().toString(36).substring(2),
        title: pastedTitle,
        type: 'text',
        content: pastedContent,
        processedDate: new Date().toISOString(),
        tags: ['Pasted'],
        summary: ''
      };

      try {
        const summary = await generateSummary(pastedContent, 'text');
        newMaterial.summary = summary;
      } catch (err) {
        console.error("Auto-summary failed", err);
        newMaterial.summary = "Summary generation failed.";
      }

      onUploadComplete(newMaterial);
      setPastedTitle('');
      setPastedContent('');
      setActiveTab('upload'); // Switch back after success
    } catch (error: any) {
      alert(`Error processing text: ${error.message}`);
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
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'upload' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}
                `}
        >
          <UploadCloud size={16} /> Upload File
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'paste' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}
                `}
        >
          <Clipboard size={16} /> Paste Text
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'upload' ? (
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
                  <span className="flex items-center gap-1"><FileText size={12} /> Docs</span>
                  <span className="flex items-center gap-1"><ImageIcon size={12} /> Images</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={pastedTitle}
                onChange={(e) => setPastedTitle(e.target.value)}
                placeholder="e.g., Lecture Notes - Chapter 1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste your text here..."
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
              />
            </div>
            <button
              onClick={handlePasteSubmit}
              disabled={isProcessing || !pastedTitle || !pastedContent}
              className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors
                            ${isProcessing || !pastedTitle || !pastedContent
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'}
                        `}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Type size={18} />}
              {isProcessing ? 'Processing...' : 'Add Material'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;