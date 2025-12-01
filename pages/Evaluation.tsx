import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { generateQuiz, generateAdvancedQuestions, evaluateAnswer } from '../services/geminiService';
import { Question, QuizLevel, QuizResult, QuestionType } from '../types';
import { GraduationCap, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight, BrainCircuit, Eye, Zap } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";

type EvaluationMode = 'standard' | 'self-eval';

const Evaluation: React.FC = () => {
    const { materials, addQuizResult } = useContext(AppContext);

    // State for Flow
    const [step, setStep] = useState<'config' | 'loading' | 'taking' | 'result'>('config');

    // Config State
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    const [mode, setMode] = useState<EvaluationMode>('standard');
    const [difficulty, setDifficulty] = useState<QuizLevel>(QuizLevel.MODERATE);
    const [questionCount, setQuestionCount] = useState(5);
    const [questionType, setQuestionType] = useState<QuestionType>('multiple-choice');

    // Quiz/Eval State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [userAnswers, setUserAnswers] = useState<(number | string)[]>([]); // number for MCQ index, string for text
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({}); // For self-eval reveal

    // AI Grading State
    const [evaluations, setEvaluations] = useState<Record<number, { score: number; feedback: string }>>({});
    const [isGrading, setIsGrading] = useState(false);

    const startEvaluation = async () => {
        if (!selectedMaterialId) return alert("Select a material first");

        setStep('loading');
        const material = materials.find(m => m.id === selectedMaterialId);
        if (!material) return;

        try {
            let generatedQuestions: Question[] = [];

            if (mode === 'standard') {
                // Standard Quiz is always MCQ
                generatedQuestions = await generateQuiz(material.content || material.summary || "", difficulty);
            } else {
                // Self Eval can be any type
                generatedQuestions = await generateAdvancedQuestions(material.content || material.summary || "", difficulty, questionType, questionCount);
            }

            setQuestions(generatedQuestions);
            setUserAnswers(new Array(generatedQuestions.length).fill(mode === 'standard' ? -1 : ''));
            setShowAnswers({});
            setEvaluations({});
            setCurrentQuestionIdx(0);
            setStep('taking');
        } catch (e) {
            console.error(e);
            alert("Failed to generate evaluation. Please try again.");
            setStep('config');
        }
    };

    const handleMCQAnswer = (optionIdx: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIdx] = optionIdx;
        setUserAnswers(newAnswers);
    };

    const handleTextAnswer = (text: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIdx] = text;
        setUserAnswers(newAnswers);
    };

    const handleGradeAnswer = async () => {
        const question = questions[currentQuestionIdx];
        const answer = userAnswers[currentQuestionIdx] as string;

        if (!answer.trim()) {
            alert("Please write an answer first.");
            return;
        }

        setIsGrading(true);
        try {
            // Determine marks based on type
            let maxMarks = 5;
            if (questionType === 'long-answer' || questionType === 'case-study') maxMarks = 20;

            const result = await evaluateAnswer(
                question.text,
                answer,
                question.modelAnswer || question.explanation || "",
                maxMarks
            );

            setEvaluations(prev => ({
                ...prev,
                [currentQuestionIdx]: result
            }));
            setShowAnswers(prev => ({ ...prev, [currentQuestionIdx]: true }));

        } catch (error) {
            alert("Grading failed. Please try again.");
        } finally {
            setIsGrading(false);
        }
    };

    const submitEvaluation = () => {
        let score = 0;

        if (mode === 'standard') {
            score = questions.reduce((acc, q, idx) => {
                return acc + (userAnswers[idx] === q.correctAnswerIndex ? 1 : 0);
            }, 0);
        } else {
            // Sum up AI scores
            score = Object.values(evaluations).reduce((acc, curr) => acc + curr.score, 0);
        }

        const result: QuizResult = {
            id: uuidv4(),
            materialId: selectedMaterialId,
            date: new Date().toISOString(),
            score, // This is raw score. For self-eval, it's sum of marks.
            totalQuestions: questions.length, // Note: This might need adjustment for percentage calc if marks vary
            level: difficulty,
            type: mode === 'standard' ? 'multiple-choice' : questionType,
            questions,
            userAnswers
        };

        addQuizResult(result);
        setStep('result');
    };

    // Helper to calculate total possible marks
    const getTotalPossibleMarks = () => {
        if (mode === 'standard') return questions.length;
        if (questionType === 'short-answer') return questions.length * 5;
        if (questionType === 'long-answer' || questionType === 'case-study') return questions.length * 20;
        return questions.length; // Fallback
    };

    if (materials.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border">
                <GraduationCap className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-700">Evaluation Mode Locked</h3>
                <p className="text-gray-500 mt-2">Upload study materials to enable AI assessment generation.</p>
            </div>
        );
    }

    /* --- Step 1: Configuration --- */
    if (step === 'config') {
        return (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                        <BrainCircuit className="text-purple-600" /> Configure Evaluation
                    </h2>
                    <p className="text-gray-500">Customize your learning assessment.</p>
                </div>

                <div className="space-y-6">
                    {/* Material Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Topic (Material)</label>
                        <select
                            className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-purple-500 outline-none"
                            value={selectedMaterialId}
                            onChange={(e) => setSelectedMaterialId(e.target.value)}
                        >
                            <option value="">-- Choose a document --</option>
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Mode</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setMode('standard')}
                                className={`p-4 rounded-xl border text-left transition-all ${mode === 'standard' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'hover:bg-gray-50'}`}
                            >
                                <div className="font-bold text-gray-900 mb-1">Standard Quiz</div>
                                <p className="text-sm text-gray-500">Multiple choice questions with automatic grading and scoring.</p>
                            </button>
                            <button
                                onClick={() => setMode('self-eval')}
                                className={`p-4 rounded-xl border text-left transition-all ${mode === 'self-eval' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'hover:bg-gray-50'}`}
                            >
                                <div className="font-bold text-gray-900 mb-1">Self Evaluation</div>
                                <p className="text-sm text-gray-500">Open-ended questions with AI grading and feedback.</p>
                            </button>
                        </div>
                    </div>

                    {/* Self Eval Options */}
                    {mode === 'self-eval' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'short-answer', label: 'Short Answer (5 Marks)' },
                                    { id: 'long-answer', label: 'Long Answer (20 Marks)' },
                                    { id: 'case-study', label: 'Case Study (20 Marks)' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setQuestionType(t.id as QuestionType)}
                                        className={`py-2 px-2 rounded-lg text-sm font-medium border
                                ${questionType === t.id ? 'bg-purple-100 border-purple-500 text-purple-800' : 'hover:bg-gray-50'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as QuizLevel)}
                                className="w-full border p-3 rounded-lg"
                            >
                                {Object.values(QuizLevel).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {mode === 'self-eval' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                    className="w-full border p-3 rounded-lg"
                                >
                                    <option value="3">3</option>
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={startEvaluation}
                            disabled={!selectedMaterialId}
                            className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                        >
                            <GraduationCap size={20} /> Start Evaluation
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* --- Step 2: Loading --- */
    if (step === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="animate-spin text-purple-600 mb-6" size={48} />
                <h3 className="text-xl font-semibold text-gray-800">Generating Assessment...</h3>
                <p className="text-gray-500 mt-2 max-w-md text-center">
                    Analyzing content and crafting {difficulty.toLowerCase()} questions...
                </p>
            </div>
        );
    }

    /* --- Step 3: Taking Evaluation --- */
    if (step === 'taking') {
        const question = questions?.[currentQuestionIdx];
        if (!question) return <div>Error loading question</div>;

        const isLast = currentQuestionIdx === questions.length - 1;
        const evaluation = evaluations[currentQuestionIdx];

        return (
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex justify-between items-center text-sm text-gray-500">
                    <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
                    <span>{mode === 'standard' ? 'Standard Quiz' : 'Self Evaluation'} • {difficulty}</span>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <h3 className="text-xl font-medium text-gray-900 mb-6">{question.text}</h3>

                    {/* Render Input based on type */}
                    <div className="space-y-4">
                        {(question.type === 'multiple-choice' || mode === 'standard') ? (
                            <div className="space-y-3">
                                {question.options?.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleMCQAnswer(idx)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3
                        ${userAnswers[currentQuestionIdx] === idx
                                                ? 'bg-purple-50 border-purple-500 text-purple-800'
                                                : 'border-gray-200 hover:bg-gray-50'}
                      `}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center
                         ${userAnswers[currentQuestionIdx] === idx ? 'border-purple-600 bg-purple-600' : 'border-gray-400'}
                      `}>
                                            {userAnswers[currentQuestionIdx] === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                value={userAnswers[currentQuestionIdx] as string || ''}
                                onChange={(e) => handleTextAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                disabled={!!evaluation}
                                className="w-full h-32 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                            ></textarea>
                        )}
                    </div>

                    {/* Self Eval: Grading Section */}
                    {mode === 'self-eval' && (
                        <div className="mt-6 pt-6 border-t">
                            {evaluation ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-indigo-900 flex items-center gap-2">
                                                <Zap size={18} className="text-indigo-600" /> AI Grading
                                            </span>
                                            <span className="text-lg font-black text-indigo-600">
                                                {evaluation.score} / {questionType === 'short-answer' ? 5 : 20}
                                            </span>
                                        </div>
                                        <p className="text-indigo-800 text-sm whitespace-pre-wrap">{evaluation.feedback}</p>
                                    </div>

                                    <div className="bg-green-50 p-4 rounded-lg text-sm text-green-900">
                                        <div className="font-bold mb-1 flex items-center gap-2"><CheckCircle size={16} /> Model Solution</div>
                                        <p>{question.explanation || question.modelAnswer || "No explanation provided."}</p>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGradeAnswer}
                                    disabled={isGrading || !userAnswers[currentQuestionIdx]}
                                    className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isGrading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                    {isGrading ? 'Grading...' : 'Submit & Evaluate'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-between">
                    <button
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx(curr => curr - 1)}
                        className="text-gray-500 font-medium px-6 py-2 hover:text-gray-800 disabled:opacity-30"
                    >
                        Previous
                    </button>

                    {isLast ? (
                        <button
                            onClick={submitEvaluation}
                            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 shadow-md shadow-green-200"
                        >
                            Finish Evaluation
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentQuestionIdx(curr => curr + 1)}
                            className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 shadow-md shadow-purple-200 flex items-center gap-2"
                        >
                            Next Question <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* --- Step 4: Results --- */
    if (step === 'result') {
        const totalPossible = getTotalPossibleMarks();
        // Calculate total score obtained
        const totalScore = mode === 'standard'
            ? questions.reduce((acc, q, idx) => acc + (userAnswers[idx] === q.correctAnswerIndex ? 1 : 0), 0)
            : Object.values(evaluations).reduce((acc, curr) => acc + curr.score, 0);

        const percentage = Math.round((totalScore / totalPossible) * 100);

        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-50 mb-4">
                        <span className={`text-3xl font-bold ${percentage >= 70 ? 'text-green-600' : 'text-purple-600'}`}>
                            {percentage}%
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Evaluation Complete!</h2>
                    <p className="text-gray-500 mt-1">
                        You scored {totalScore} out of {totalPossible} on {difficulty}
                    </p>

                    <div className="mt-6 flex justify-center gap-4">
                        <button
                            onClick={() => { setStep('config'); setUserAnswers([]); setShowAnswers({}); setEvaluations({}); }}
                            className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                            Start New Evaluation
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Detailed Analysis</h3>
                    {questions.map((q, idx) => {
                        const evaluation = evaluations[idx];
                        const isCorrect = mode === 'standard'
                            ? userAnswers[idx] === q.correctAnswerIndex
                            : (evaluation?.score || 0) / (questionType === 'short-answer' ? 5 : 20) >= 0.5;

                        const userAnswerText = mode === 'standard'
                            ? (q.options?.[userAnswers[idx] as number] || "Skipped")
                            : (userAnswers[idx] as string || "No answer provided");

                        return (
                            <div key={q.id} className={`bg-white p-6 rounded-lg border-l-4 shadow-sm ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                <div className="flex items-start gap-3">
                                    {mode === 'standard' ? (
                                        isCorrect ? <CheckCircle className="text-green-500 shrink-0 mt-1" /> : <XCircle className="text-red-500 shrink-0 mt-1" />
                                    ) : (
                                        <div className={`shrink-0 mt-1 font-bold ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                                            {evaluation?.score || 0}/{questionType === 'short-answer' ? 5 : 20}
                                        </div>
                                    )}
                                    <div className="w-full">
                                        <h4 className="font-medium text-gray-900">{q.text}</h4>

                                        <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                            <span className="font-semibold text-gray-600 block mb-1">Your Answer:</span>
                                            <p className="text-gray-800">{userAnswerText}</p>
                                        </div>

                                        {mode === 'self-eval' && evaluation && (
                                            <div className="mt-3 p-3 bg-indigo-50 rounded text-sm">
                                                <span className="font-semibold text-indigo-800 block mb-1">AI Feedback:</span>
                                                <p className="text-indigo-900">{evaluation.feedback}</p>
                                            </div>
                                        )}

                                        {(!isCorrect || mode === 'self-eval') && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                                                <span className="font-semibold text-blue-800 block mb-1 flex items-center gap-2">
                                                    <AlertCircle size={14} /> Model Answer / Explanation:
                                                </span>
                                                <p className="text-blue-900">{q.explanation || q.modelAnswer}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
};

export default Evaluation;
