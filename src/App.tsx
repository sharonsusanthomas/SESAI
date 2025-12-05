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
    try {
      // Fetch the auth URL from backend
      const response = await fetch('http://localhost:8000/auth/google');
      const data = await response.json();

      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-blue-600">Loading EduNova AI...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-blue-600">Welcome to EduNova AI</h1>
          <p className="text-gray-600">Please sign in to continue</p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>
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