import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { generateQuiz } from '../services/aiService';
import { Question, QuizLevel, QuizResult } from '../types';
import { GraduationCap, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";


const Quiz: React.FC = () => {
  const { materials, addQuizResult } = useContext(AppContext);

  // State for Flow
  const [step, setStep] = useState<'config' | 'loading' | 'taking' | 'result'>('config');

  // Config State
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<QuizLevel>(QuizLevel.SIMPLE);

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const startQuiz = async () => {
    if (!selectedMaterialId) return alert("Select a material first");

    setStep('loading');
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;

    try {
      const generatedQuestions = await generateQuiz(material.content || material.summary || "", difficulty);
      setQuestions(generatedQuestions);
      setUserAnswers(new Array(generatedQuestions.length).fill(-1));
      setStep('taking');
    } catch (e) {
      alert("Failed to generate quiz. Please try again.");
      setStep('config');
    }
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setUserAnswers(newAnswers);
  };

  const submitQuiz = () => {
    // Calculate score
    const score = questions.reduce((acc, q, idx) => {
      return acc + (userAnswers[idx] === q.correctAnswerIndex ? 1 : 0);
    }, 0);

    const result: QuizResult = {
      id: uuidv4(),
      materialId: selectedMaterialId,
      date: new Date().toISOString(),
      score,
      totalQuestions: questions.length,
      level: difficulty,
      type: 'multiple-choice',
      questions,
      userAnswers
    };

    addQuizResult(result);
    setStep('result');
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
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Configure Evaluation</h2>
          <p className="text-gray-500">Customize your AI-generated exam.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Topic (Material)</label>
            <select
              className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
            >
              <option value="">-- Choose a document --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(QuizLevel).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all
                    ${difficulty === lvl
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={startQuiz}
              disabled={!selectedMaterialId}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              <GraduationCap size={20} /> Generate Assessment
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
        <Loader2 className="animate-spin text-blue-600 mb-6" size={48} />
        <h3 className="text-xl font-semibold text-gray-800">Generating Questions...</h3>
        <p className="text-gray-500 mt-2 max-w-md text-center">
          The AI is analyzing your material "{materials.find(m => m.id === selectedMaterialId)?.title}" and drafting {difficulty.toLowerCase()} questions.
        </p>
      </div>
    );
  }

  /* --- Step 3: Taking Quiz --- */
  if (step === 'taking') {
    const question = questions?.[currentQuestionIdx];
    if (!question) return <div>Error loading question</div>;

    const isLast = currentQuestionIdx === questions.length - 1;

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center text-sm text-gray-500">
          <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
          <span>{difficulty}</span>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-medium text-gray-900 mb-6">{question.text}</h3>

          <div className="space-y-3">
            {question.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3
                   ${userAnswers[currentQuestionIdx] === idx
                    ? 'bg-blue-50 border-blue-500 text-blue-800'
                    : 'border-gray-200 hover:bg-gray-50'}
                 `}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center
                    ${userAnswers[currentQuestionIdx] === idx ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}
                 `}>
                  {userAnswers[currentQuestionIdx] === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                {opt}
              </button>
            ))}
          </div>
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
              onClick={submitQuiz}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 shadow-md shadow-green-200"
            >
              Submit Assessment
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIdx(curr => curr + 1)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2"
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
    const score = questions.reduce((acc, q, idx) => acc + (userAnswers[idx] === q.correctAnswerIndex ? 1 : 0), 0);
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 mb-4">
            <span className={`text-3xl font-bold ${percentage >= 70 ? 'text-green-600' : 'text-blue-600'}`}>
              {percentage}%
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Complete!</h2>
          <p className="text-gray-500 mt-1">
            You scored {score} out of {questions.length} on {difficulty}
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => { setStep('config'); setUserAnswers([]); }}
              className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Take Another Quiz
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Detailed Analysis</h3>
          {questions.map((q, idx) => {
            const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
            return (
              <div key={q.id} className={`bg-white p-6 rounded-lg border-l-4 shadow-sm ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                <div className="flex items-start gap-3">
                  {isCorrect ? <CheckCircle className="text-green-500 shrink-0 mt-1" /> : <XCircle className="text-red-500 shrink-0 mt-1" />}
                  <div>
                    <h4 className="font-medium text-gray-900">{q.text}</h4>
                    <p className="text-sm text-gray-500 mt-1">Your answer: <span className={isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{q.options?.[userAnswers[idx] as number] || "Skipped"}</span></p>

                    {!isCorrect && (
                      <p className="text-sm text-gray-500 mt-1">Correct answer: <span className="text-green-700 font-medium">{q.options?.[q.correctAnswerIndex ?? 0]}</span></p>
                    )}

                    <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-600 flex gap-2 items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-blue-500" />
                      <p>{q.explanation}</p>
                    </div>
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

export default Quiz;