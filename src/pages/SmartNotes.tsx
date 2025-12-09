import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { generateSmartNotes } from '../services/aiService';
import { Loader2, FileText, List, GitGraph, Book, AlignLeft, Layers, Upload } from 'lucide-react';

const SmartNotes: React.FC = () => {
    const { materials, updateMaterialNotes, activeMaterialId } = useContext(AppContext);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>(activeMaterialId || materials[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'summary' | 'keyPoints' | 'mindmap' | 'definitions' | 'detailed'>('summary');

    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

    // Update selected ID if activeMaterialId changes (e.g. from Dashboard)
    useEffect(() => {
        if (activeMaterialId) {
            setSelectedMaterialId(activeMaterialId);
        }
    }, [activeMaterialId]);

    const handleGenerate = async () => {
        if (!selectedMaterial) return;
        setLoading(true);
        try {
            // This now calls OpenAI with the full structured schema
            const notes = await generateSmartNotes(selectedMaterial.id);
            updateMaterialNotes(selectedMaterial.id, notes);
        } catch (e) {
            console.error(e);
            alert("Failed to generate smart notes. Ensure your content isn't too large for a single pass.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const notes = selectedMaterial?.smartNotes;
        if (!notes || !selectedMaterial) return;

        const content = `
# ${selectedMaterial.title} - Smart Notes

## Executive Summary
${notes.summary}

## Key Takeaways
${notes.bulletPoints.map(p => `- ${p}`).join('\n')}

## Definitions
${notes.definitions.map(d => `**${d.term}**: ${d.definition}`).join('\n')}

## Detailed Notes
${notes.detailedNotes.map(s => `### ${s.heading}\n${s.content}`).join('\n\n')}
    `.trim();

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedMaterial.title.replace(/\s+/g, '_')}_notes.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (materials.length === 0) {
        return <div className="p-10 text-center text-gray-500">Upload materials first.</div>;
    }

    const notes = selectedMaterial?.smartNotes;

    const tabs = [
        { id: 'summary', label: 'Summary', icon: <AlignLeft size={16} /> },
        { id: 'keyPoints', label: 'Bullet Points', icon: <List size={16} /> },
        { id: 'mindmap', label: 'Mind Map Structure', icon: <GitGraph size={16} /> },
        { id: 'definitions', label: 'Definitions', icon: <Book size={16} /> },
        { id: 'detailed', label: 'Detailed Notes', icon: <FileText size={16} /> },
    ];

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Smart Notes Organizer</h2>
                    <p className="text-gray-500">View structured breakdowns of your material.</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        className="border p-2 rounded-lg bg-gray-50 min-w-[200px]"
                    >
                        {materials.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                    {notes && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                        >
                            <Upload className="rotate-180" size={18} /> Download
                        </button>
                    )}
                </div>
            </header>

            {!notes ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border shadow-sm">
                    <FileText size={64} className="text-gray-200 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">No Structured Notes Yet</h3>
                    <p className="text-gray-500 mb-6">Generate AI-powered structured notes for this document.</p>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <FileText size={18} />}
                        {loading ? 'Analyzing Content...' : 'Generate Smart Notes'}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border min-h-[500px] flex flex-col md:flex-row overflow-hidden">
                    {/* Tabs Sidebar */}
                    <div className="w-full md:w-64 bg-gray-50 border-r flex-shrink-0">
                        <div className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Sections</div>
                        <nav className="space-y-1 px-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                                ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto max-h-[700px]">
                        {activeTab === 'summary' && (
                            <div className="prose max-w-none">
                                <h3 className="text-xl font-bold mb-4">Executive Summary</h3>
                                <p className="text-gray-700 leading-relaxed">{notes.summary}</p>
                            </div>
                        )}

                        {activeTab === 'keyPoints' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">Key Takeaways</h3>
                                <ul className="space-y-3">
                                    {notes.bulletPoints.map((point, i) => (
                                        <li key={i} className="flex gap-3 bg-blue-50 p-4 rounded-lg text-blue-900 text-sm">
                                            <span className="font-bold text-blue-400">•</span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {activeTab === 'mindmap' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">Conceptual Hierarchy</h3>
                                <div className="space-y-6">
                                    {notes.mindMap.map((node, i) => (
                                        <div key={i} className="border rounded-xl p-4 bg-gray-50">
                                            <h4 className="font-bold text-lg text-gray-900 mb-2">{node.topic}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {node.subtopics.map((sub, j) => (
                                                    <span key={j} className="bg-white border px-3 py-1 rounded-full text-sm text-gray-600">
                                                        {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'definitions' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">Glossary & Definitions</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {notes.definitions.map((def, i) => (
                                        <div key={i} className="border p-4 rounded-lg hover:shadow-md transition-shadow bg-white">
                                            <span className="block font-bold text-gray-900 mb-1">{def.term}</span>
                                            <span className="text-gray-600 text-sm">{def.definition}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'detailed' && (
                            <div className="prose max-w-none">
                                <h3 className="text-xl font-bold mb-6">Detailed Study Notes</h3>
                                <div className="space-y-8">
                                    {notes.detailedNotes.map((section, i) => (
                                        <div key={i}>
                                            <h4 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">{section.heading}</h4>
                                            <p className="text-gray-700 leading-7 whitespace-pre-wrap">{section.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartNotes;