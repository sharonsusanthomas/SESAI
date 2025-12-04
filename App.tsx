import React, { useState, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppState, LearningMaterial, QuizResult, SmartNotes, AssessmentQuestion } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Analytics from './pages/Analytics';
import SmartNotesPage from './pages/SmartNotes';
import Evaluation from './pages/Evaluation';
import { authAPI, materialsAPI, quizAPI, isAuthenticated, setAuthToken } from './services/api';
import { adaptMaterialsFromBackend } from './services/materialAdapter';
import { BookOpen, Sparkles } from 'lucide-react';

// User type
interface User {
  id: string;
  email: string;
  name: string;
  picture_url?: string;
}

// Create Context with user
export const AppContext = createContext<AppState & { user: User | null }>({
  materials: [],
  quizHistory: [],
  activeMaterialId: null,
  user: null,
  addMaterial: () => { },
  removeMaterial: () => { },
  updateMaterialSummary: () => { },
  updateMaterialNotes: () => { },
  updateMaterialAssessments: () => { },
  addQuizResult: () => { },
  setActiveMaterialId: () => { }
});

const AppContent: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication and load user data
  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        try {
          // Handle OAuth callback
          const data = await authAPI.handleCallback(code);
          setAuthToken(data.access_token);
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          // Clean URL
          window.history.replaceState({}, document.title, '/');
        } catch (error) {
          console.error('OAuth callback error:', error);
        }
      } else if (isAuthenticated()) {
        // Load user from storage or fetch from API
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          try {
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('access_token');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Load materials and quiz history from backend when user is authenticated
  useEffect(() => {
    if (user) {
      loadMaterials();
      loadQuizHistory();
    }
  }, [user]);

  const loadMaterials = async () => {
    try {
      const data = await materialsAPI.list();
      // FIX: Adapt backend data to frontend model
      const adaptedMaterials = adaptMaterialsFromBackend(data);
      setMaterials(adaptedMaterials);
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadQuizHistory = async () => {
    try {
      const data = await quizAPI.history();
      setQuizHistory(data.results || []);
    } catch (error) {
      console.error('Failed to load quiz history:', error);
    }
  };

  const addMaterial = (material: LearningMaterial) => {
    setMaterials(prev => [material, ...prev]);
  };

  const removeMaterial = async (id: string) => {
    try {
      await materialsAPI.delete(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      if (activeMaterialId === id) setActiveMaterialId(null);
    } catch (error) {
      console.error('Failed to delete material:', error);
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
      const data = await authAPI.googleLogin();
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setAuthToken(''); // Clear token
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
      setMaterials([]);
      setQuizHistory([]);
      window.location.href = '/';
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-10 h-10 text-indigo-600" />
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SESAI</h1>
            <p className="text-gray-600">AI-Powered Student Learning Assistant</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-semibold">✓</span>
              </div>
              <span>Upload study materials (PDFs, images, text)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-semibold">✓</span>
              </div>
              <span>Generate AI-powered smart notes</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-semibold">✓</span>
              </div>
              <span>Take adaptive quizzes and track progress</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-semibold">✓</span>
              </div>
              <span>Chat with AI tutor for personalized help</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-xs text-gray-500 text-center mt-6">
            Your data is stored securely in your Google Drive
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      materials,
      quizHistory,
      activeMaterialId,
      user,
      addMaterial,
      removeMaterial,
      updateMaterialSummary,
      updateMaterialNotes,
      updateMaterialAssessments,
      addQuizResult,
      setActiveMaterialId
    }}>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/study" element={<Study />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/smart-notes" element={<SmartNotesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;