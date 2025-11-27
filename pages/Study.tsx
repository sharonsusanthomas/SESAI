import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { MessageSquare, Book, ChevronRight, Send, User, Bot, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { askTutor } from '../services/geminiService';

const Study: React.FC = () => {
  const { materials, activeMaterialId, setActiveMaterialId } = useContext(AppContext);
  // Default to active material or first available
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(activeMaterialId || materials[0]?.id || null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am your AI Tutor. Select a material from the left and ask me anything about it.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync internal state with global active ID if it changes
  useEffect(() => {
    if (activeMaterialId) {
        setSelectedMaterialId(activeMaterialId);
    } else if (materials.length > 0 && !selectedMaterialId) {
        setSelectedMaterialId(materials[0].id);
    }
  }, [activeMaterialId, materials]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    const context = selectedMaterial ? 
      `Title: ${selectedMaterial.title}\n\nSummary: ${selectedMaterial.summary}\n\nContent: ${selectedMaterial.content}` 
      : undefined;

    const responseText = await askTutor(history, userMsg.text, context);

    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  if (materials.length === 0) {
    return (
      <div className="text-center py-20">
        <Book className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-700">No Materials Found</h3>
        <p className="text-gray-500">Please upload some documents in the "Inputs" tab first.</p>
      </div>
    );
  }

  const handleSelectMaterial = (id: string) => {
      setSelectedMaterialId(id);
      setActiveMaterialId(id); // Update global state too
      setMessages([{ id: crypto.randomUUID(), role: 'model', text: 'Context updated. Ask away!', timestamp: Date.now() }]);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Material List & Content Viewer */}
      <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Book size={18} /> Course Material
          </h3>
        </div>
        
        {/* List */}
        <div className="overflow-x-auto p-2 border-b flex gap-2">
           {materials.map(m => (
             <button
               key={m.id}
               onClick={() => handleSelectMaterial(m.id)}
               className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                 ${selectedMaterialId === m.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
               `}
             >
               {m.title.length > 20 ? m.title.substring(0, 20) + '...' : m.title}
             </button>
           ))}
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
          {selectedMaterial ? (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedMaterial.title}</h2>
              {selectedMaterial.type === 'image' && (
                <div className="mb-4 rounded-lg overflow-hidden border">
                   <img src={selectedMaterial.content} alt="Material" className="w-full object-cover" />
                </div>
              )}
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <h4 className="text-yellow-800 font-bold text-xs uppercase tracking-wide mb-1">AI Summary</h4>
                <div className="text-yellow-900 whitespace-pre-wrap">{selectedMaterial.summary}</div>
              </div>

              {(selectedMaterial.type === 'text' || selectedMaterial.type === 'pdf') && (
                <div className="text-gray-700 whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border">
                  {selectedMaterial.content}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 mt-10">Select a material to view details</div>
          )}
        </div>
      </div>

      {/* AI Tutor Chat */}
      <div className="w-2/3 flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-500" /> AI Tutor Assistant
          </h3>
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
            Context: {selectedMaterial?.title || 'General'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                 {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                 <Bot size={16} />
               </div>
               <div className="bg-white border px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about your notes..."
              className="flex-1 bg-gray-100 border-0 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="flex gap-2 mt-2 px-2">
            {["Explain like I'm 5", "Create a summary", "Give examples"].map(suggestion => (
               <button 
                 key={suggestion}
                 onClick={() => setInput(suggestion)}
                 className="text-xs text-gray-500 bg-gray-50 border px-2 py-1 rounded-md hover:bg-gray-100"
               >
                 {suggestion}
               </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Study;