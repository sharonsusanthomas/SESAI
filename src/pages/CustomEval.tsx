import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { generateAdvancedQuestions } from '../services/aiService';
import { QuizLevel, QuestionType, Question } from '../types';
import { BrainCircuit, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const CustomEval: React.FC = () => {
    const { materials } = useContext(AppContext);
    const [step, setStep] = useState<'config' | 'generating' | 'active'>('config');

    // Config
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [type, setType] = useState<QuestionType>('multiple-choice');
    const [difficulty, setDifficulty] = useState<QuizLevel>(QuizLevel.MODERATE);
    const [count, setCount] = useState(5);

    // Active Quiz
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

    const handleStart = async () => {
        if (!selectedMaterialId) return alert("Select material");
        setStep('generating');
        const material = materials.find(m => m.id === selectedMaterialId);
        if (!material) return;

        try {
            const qs = await generateAdvancedQuestions(material.content || material.summary || "", difficulty, type, count);
            setQuestions(qs);
            setStep('active');
            setShowAnswers({});
        } catch (e) {
            alert("Error generating questions.");
            setStep('config');
        }
    };

    if (step === 'config') {
        return (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BrainCircuit className="text-purple-600" /> Custom Evaluation Setup
                </h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Source Material</label>
                        <select
                            value={selectedMaterialId}
                            onChange={(e) => setSelectedMaterialId(e.target.value)}
                            className="w-full border p-3 rounded-lg"
                        >
                            <option value="">-- Select Material --</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { id: 'multiple-choice', label: 'MCQ' },
                                { id: 'short-answer', label: 'Short Answer' },
                                { id: 'long-answer', label: 'Long Answer' },
                                { id: 'case-study', label: 'Case Study' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id as QuestionType)}
                                    className={`py-3 px-2 rounded-lg text-sm font-medium border
                                      ${type === t.id ? 'bg-purple-50 border-purple-500 text-purple-700' : 'hover:bg-gray-50'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as QuizLevel)}
                                className="w-full border p-3 rounded-lg"
                            >
                                {Object.values(QuizLevel).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
                            <select
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-full border p-3 rounded-lg"
                            >
                                <option value="3">3</option>
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="15">15</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 mt-4"
                    >
                        Generate Evaluation
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
                <p className="text-gray-600">Generating {difficulty.toLowerCase()} {type.replace('-', ' ')} questions...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Custom Evaluation</h2>
                <button onClick={() => setStep('config')} className="text-sm text-purple-600 hover:underline">New Configuration</button>
            </header>

            <div className="space-y-6">
                {questions.map((q, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-lg text-gray-900"><span className="text-gray-400 mr-2">Q{idx + 1}.</span> {q.text}</h3>
                        </div>

                        {/* Render input area based on type (Self-eval style) */}
                        <div className="mb-4">
                            {q.type === 'multiple-choice' ? (
                                <div className="space-y-2">
                                    {q.options?.map((opt, i) => (
                                        <div key={i} className={`p-3 rounded-lg border ${showAnswers[idx] && i === q.correctAnswerIndex ? 'bg-green-100 border-green-400 font-medium' : 'bg-gray-50'}`}>
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    placeholder="Type your answer here..."
                                    className="w-full h-24 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                ></textarea>
                            )}
                        </div>

                        {/* Reveal Answer */}
                        <div className="border-t pt-4">
                            {showAnswers[idx] ? (
                                <div className="bg-green-50 p-4 rounded-lg text-sm text-green-900">
                                    <div className="font-bold mb-1 flex items-center gap-2"><CheckCircle size={16} /> Model Solution / Explanation</div>
                                    <p>{q.explanation || q.modelAnswer || "Must be the answer to the question."}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAnswers(prev => ({ ...prev, [idx]: true }))}
                                    className="text-purple-600 text-sm font-medium flex items-center gap-2 hover:bg-purple-50 px-3 py-2 rounded transition-colors"
                                >
                                    <Eye size={16} /> Show Solution
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomEval;
