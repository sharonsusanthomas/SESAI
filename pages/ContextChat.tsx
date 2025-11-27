import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Send, User, Bot, AlertTriangle, FileQuestion } from 'lucide-react';
import { ChatMessage } from '../types';
import { askStrictTutor } from '../services/geminiService';

const ContextChat: React.FC = () => {
  const { materials } = useContext(AppContext);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(materials[0]?.id || null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Meow! I am your Strict Context Bot. I only know what is in your uploaded notes. Try to trick me, but I won\'t answer outside knowledge!', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!selectedMaterialId) {
        alert("Please select a material source.");
        return;
    }

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
    const material = materials.find(m => m.id === selectedMaterialId);
    const context = material ? 
      `Title: ${material.title}\n\nContent: ${material.content}` 
      : "";

    const responseText = await askStrictTutor(history, userMsg.text, context);

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
      <div className="text-center py-20 bg-white rounded-xl shadow-sm">
        <FileQuestion className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-700">No Context Available</h3>
        <p className="text-gray-500">Please upload materials to activate the Strict Context Bot.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden">
      {/* Header with Strict Mode Warning */}
      <div className="p-4 bg-orange-50 border-b border-orange-200 flex justify-between items-center">
        <div>
            <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <Bot size={20} /> Strict Context Bot
            </h3>
            <p className="text-xs text-orange-600">Restricted to uploaded material only.</p>
        </div>
        
        <select 
            value={selectedMaterialId || ''}
            onChange={(e) => {
                setSelectedMaterialId(e.target.value);
                setMessages([{ id: crypto.randomUUID(), role: 'model', text: 'Context switched. What would you like to know about this specific document?', timestamp: Date.now() }]);
            }}
            className="text-sm border-orange-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-orange-500 outline-none max-w-xs"
        >
            {materials.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
            ))}
        </select>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50" ref={scrollRef}>
        {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2
                ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-600' : 'bg-orange-500 text-white border-orange-500'}`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                 {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                 {msg.role === 'model' && msg.text.includes("cannot find") && (
                     <div className="mt-2 text-xs text-orange-600 flex items-center gap-1 bg-orange-50 p-1 rounded">
                         <AlertTriangle size={12} /> Out of context
                     </div>
                 )}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center">
                 <Bot size={20} />
               </div>
               <div className="bg-white border px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
               </div>
             </div>
          )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask strictly about the notes..."
              className="flex-1 bg-gray-100 border-0 rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-2 p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-md"
            >
              <Send size={20} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default ContextChat;
