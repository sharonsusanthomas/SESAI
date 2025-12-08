import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Send, User, Bot, FileQuestion, ExternalLink, CheckCircle } from 'lucide-react';
import { SmartChatMessage, SmartChatResponse, Reference } from '../types';
import { tutorAPI } from '../services/api';

const SmartChat: React.FC = () => {
    const { materials } = useContext(AppContext);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(materials[0]?.id || null);
    const [messages, setMessages] = useState<SmartChatMessage[]>([
        {
            id: '1',
            role: 'model',
            text: 'Hello! I\'m your Smart AI Tutor. I can answer questions from your study material, and with your permission, I can also search for additional educational content with references.',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [allowExternal, setAllowExternal] = useState(false);
    const [rememberPreference, setRememberPreference] = useState(false);
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

        const userMsg: SmartChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const history = messages.map(m => ({ role: m.role, text: m.text }));

            const response: SmartChatResponse = await tutorAPI.smartChat({
                messages: [...history, { role: 'user', text: userMsg.text }],
                material_id: selectedMaterialId,
                allow_external: allowExternal,
            });

            const botMsg: SmartChatMessage = {
                id: crypto.randomUUID(),
                role: 'model',
                text: response.response,
                timestamp: Date.now(),
                references: response.references || undefined,
                usedExternal: response.used_external
            };

            setMessages(prev => [...prev, botMsg]);

            // If permission is needed, show it in the UI
            if (response.needs_permission) {
                // The response text already asks for permission
                // User can click "Allow External Search" button
            }
        } catch (error) {
            console.error('Smart chat error:', error);
            const errorMsg: SmartChatMessage = {
                id: crypto.randomUUID(),
                role: 'model',
                text: 'Sorry, I encountered an error. Please try again.',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleAllowExternal = () => {
        setAllowExternal(true);
        if (rememberPreference) {
            // Store in session storage
            sessionStorage.setItem('smart_chat_allow_external', 'true');
        }
    };

    if (materials.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <FileQuestion className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-700">No Materials Available</h3>
                <p className="text-gray-500">Please upload materials to use the Smart AI Tutor.</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-purple-50 border-b border-purple-200 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-purple-800 flex items-center gap-2">
                        <Bot size={20} /> Smart AI Tutor
                    </h3>
                    <p className="text-xs text-purple-600">Context-aware with optional external knowledge</p>
                </div>

                <select
                    value={selectedMaterialId || ''}
                    onChange={(e) => {
                        setSelectedMaterialId(e.target.value);
                        setMessages([{
                            id: crypto.randomUUID(),
                            role: 'model',
                            text: 'Material switched. How can I help you with this topic?',
                            timestamp: Date.now()
                        }]);
                    }}
                    className="text-sm border-purple-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500 outline-none max-w-xs"
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
              ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-600' : 'bg-purple-500 text-white border-purple-500'}`}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm shadow-sm
              ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                            {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}

                            {/* External knowledge indicator */}
                            {msg.usedExternal && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-1 text-xs text-purple-600 font-medium mb-2">
                                        <ExternalLink size={12} /> External Knowledge Used
                                    </div>
                                    {msg.references && msg.references.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-gray-600">References:</p>
                                            {msg.references.map((ref, idx) => (
                                                <div key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                                    <CheckCircle size={10} className="mt-0.5 text-green-600" />
                                                    <span><strong>{ref.source}:</strong> {ref.relevance}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
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

            {/* Input Area with Permission Controls */}
            <div className="p-4 bg-white border-t">
                {!allowExternal && (
                    <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberPreference}
                                    onChange={(e) => setRememberPreference(e.target.checked)}
                                    className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="remember" className="text-xs text-purple-700">
                                    Remember for this session
                                </label>
                            </div>
                            <button
                                onClick={handleAllowExternal}
                                className="px-4 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Allow External Search
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask anything about your study material..."
                        className="flex-1 bg-gray-100 border-0 rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isTyping || !input.trim()}
                        className="absolute right-2 top-2 p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-50 transition-colors shadow-md"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartChat;
