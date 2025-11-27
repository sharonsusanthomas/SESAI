import React, { useState, createContext, useEffect } from 'react';
import { AppState, LearningMaterial, QuizResult, SmartNotes, AssessmentQuestion } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Quiz from './pages/Quiz';
import Analytics from './pages/Analytics';
import SmartNotesPage from './pages/SmartNotes';
import CustomEval from './pages/CustomEval';

// Create Context
export const AppContext = createContext<AppState>({
  materials: [],
  quizHistory: [],
  activeMaterialId: null,
  addMaterial: () => {},
  removeMaterial: () => {},
  updateMaterialSummary: () => {},
  updateMaterialNotes: () => {},
  updateMaterialAssessments: () => {},
  addQuizResult: () => {},
  setActiveMaterialId: () => {}
});

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedMaterials = localStorage.getItem('studentai_materials');
    const savedHistory = localStorage.getItem('studentai_history');
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    if (savedHistory) setQuizHistory(JSON.parse(savedHistory));
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('studentai_materials', JSON.stringify(materials));
    localStorage.setItem('studentai_history', JSON.stringify(quizHistory));
  }, [materials, quizHistory]);

  const addMaterial = (material: LearningMaterial) => {
    setMaterials(prev => [material, ...prev]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    if (activeMaterialId === id) setActiveMaterialId(null);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'study': return <Study />;
      case 'quiz': return <Quiz />;
      case 'analytics': return <Analytics />;
      case 'smart-notes': return <SmartNotesPage />;
      case 'custom-eval': return <CustomEval />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

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
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </AppContext.Provider>
  );
};

export default App;