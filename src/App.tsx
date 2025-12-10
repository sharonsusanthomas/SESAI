import React, { useState, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AppState, LearningMaterial, QuizResult, SmartNotes, AssessmentQuestion } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Analytics from './pages/Analytics';
import SmartNotesPage from './pages/SmartNotes';
import Evaluation from './pages/Evaluation';
import { materialsAPI, quizAPI, setAuthToken } from './services/api';

// Create Context
export const AppContext = createContext<AppState>({
  materials: [],
  quizHistory: [],
  activeMaterialId: null,
  addMaterial: () => { },
  removeMaterial: () => { },
  updateMaterialSummary: () => { },
  updateMaterialNotes: () => { },
  updateMaterialAssessments: () => { },
  addQuizResult: () => { },
  setActiveMaterialId: () => { }
});

// OAuth Callback Component
const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Exchange code for token
        const response = await fetch(`http://localhost:8000/auth/callback?code=${code}`);
        const data = await response.json();

        if (data.access_token) {
          // Store token
          setAuthToken(data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          setError('Failed to get access token');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen text-blue-600">
      Completing authentication...
    </div>
  );
};

const AppContent: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Load activeMaterialId from localStorage on mount
  useEffect(() => {
    const savedMaterialId = localStorage.getItem('activeMaterialId');
    if (savedMaterialId && materials.some(m => m.id === savedMaterialId)) {
      setActiveMaterialId(savedMaterialId);
    } else if (materials.length > 0 && !activeMaterialId) {
      // Auto-select first material if none selected
      setActiveMaterialId(materials[0].id);
    }
  }, [materials]);

  // Persist activeMaterialId to localStorage when it changes
  useEffect(() => {
    if (activeMaterialId) {
      localStorage.setItem('activeMaterialId', activeMaterialId);
    }
  }, [activeMaterialId]);

  // Load from API on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [materialsResponse, historyResponse] = await Promise.all([
          materialsAPI.list(),
          quizAPI.history()
        ]);

        // Map backend materials to frontend format
        const mappedMaterials = (materialsResponse.materials || []).map((m: any): LearningMaterial => ({
          id: m.id,
          title: m.filename,
          type: m.file_type === 'pdf' ? 'pdf' : m.file_type === 'image' ? 'image' : 'text',
          content: m.summary || '',
          summary: m.summary,
          smartNotes: undefined,
          assessments: [],
          processedDate: m.created_at,
          tags: []
        }));
        setMaterials(mappedMaterials);

        // Map backend history to frontend QuizResult type
        const mappedHistory = (historyResponse.results || []).map((h: any) => ({
          id: h.id,
          materialId: h.material_id,
          date: h.created_at,
          score: h.score,
          totalQuestions: h.total_questions,
          level: h.difficulty,
          type: h.quiz_type,
          questions: h.questions,
          userAnswers: h.user_answers
        }));
        setQuizHistory(mappedHistory);
      } catch (error) {
        console.error("Failed to fetch data", error);
        // Fallback to local storage if API fails
        const savedMaterials = localStorage.getItem('studentai_materials');
        const savedHistory = localStorage.getItem('studentai_history');
        if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
        if (savedHistory) setQuizHistory(JSON.parse(savedHistory));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  // Save changes to local storage as backup
  useEffect(() => {
    localStorage.setItem('studentai_materials', JSON.stringify(materials));
    localStorage.setItem('studentai_history', JSON.stringify(quizHistory));
  }, [materials, quizHistory]);

  const addMaterial = (material: LearningMaterial) => {
    setMaterials(prev => [material, ...prev]);
  };

  const removeMaterial = async (id: string) => {
    try {
      await materialsAPI.delete(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      if (activeMaterialId === id) setActiveMaterialId(null);
    } catch (error) {
      console.error("Failed to delete material", error);
      alert("Failed to delete material from server.");
    }
  };

  const updateMaterialSummary = (id: string, summary: string) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, summary } : m));
  };

  const updateMaterialNotes = (id: string, notes: SmartNotes) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, smartNotes: notes } : m));
  };

  const updateMaterialAssessments = (id: string, assessments: AssessmentQuestion[]) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, assessments } : m));
  }

  const addQuizResult = (result: QuizResult) => {
    setQuizHistory(prev => [result, ...prev]);
  };

  const handleLogin = async () => {
    console.log('🔵 LOGIN BUTTON CLICKED!');
    try {
      console.log('🔵 Fetching auth URL...');
      const response = await fetch('http://localhost:8000/auth/google');
      console.log('🔵 Response:', response);
      const data = await response.json();
      console.log('🔵 Data:', data);

      console.log('🔵 Redirecting to:', data.auth_url);
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('❌ Login error:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-blue-600">Loading EduNova AI...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo/Brand Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">EduNova AI</h1>
            <p className="text-gray-600 text-lg">Your Intelligent Learning Companion</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-500">Sign in to continue your learning journey</p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl font-medium hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md group"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-base">Continue with Google</span>
            </button>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure university-grade authentication</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/50 backdrop-blur rounded-xl p-4 border border-gray-100">
              <div className="text-2xl mb-1">📚</div>
              <div className="text-xs text-gray-600 font-medium">Smart Notes</div>
            </div>
            <div className="bg-white/50 backdrop-blur rounded-xl p-4 border border-gray-100">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs text-gray-600 font-medium">AI Quizzes</div>
            </div>
            <div className="bg-white/50 backdrop-blur rounded-xl p-4 border border-gray-100">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-xs text-gray-600 font-medium">AI Tutor</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      materials,
      quizHistory,
      activeMaterialId,
      addMaterial,
      removeMaterial,
      updateMaterialSummary,
      updateMaterialNotes,
      updateMaterialAssessments,
      addQuizResult,
      setActiveMaterialId
    }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/study" element={<Study />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/smart-notes" element={<SmartNotesPage />} />
        </Routes>
      </Layout>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;