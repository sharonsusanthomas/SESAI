export interface SmartNotes {
  summary: string;
  bulletPoints: string[];
  detailedNotes: { heading: string; content: string }[];
  definitions: { term: string; definition: string }[];
  mindMap: { topic: string; subtopics: string[] }[];
}

export interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: "MCQ";
}

export interface AIResponseData {
  notes: SmartNotes;
  assessments: AssessmentQuestion[];
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  content: string; // Text content or base64 data
  summary?: string;
  smartNotes?: SmartNotes; 
  assessments?: AssessmentQuestion[];
  processedDate: string;
  tags: string[];
}

export enum QuizLevel {
  SIMPLE = 'Level 1 - Simple',
  MODERATE = 'Level 2 - Moderate',
  ADVANCED = 'Level 3 - Advanced',
}

export type QuestionType = 'multiple-choice' | 'short-answer' | 'long-answer' | 'case-study';

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[]; // Only for MCQ
  correctAnswerIndex?: number; // Only for MCQ
  modelAnswer?: string; // For non-MCQ
  explanation?: string;
}

export interface QuizResult {
  id: string;
  materialId: string;
  date: string;
  score: number | null; // Null if self-graded or open-ended
  totalQuestions: number;
  level: QuizLevel;
  type: QuestionType;
  questions: Question[];
  userAnswers: (number | string)[]; // Index for MCQ, Text for others
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AppState {
  materials: LearningMaterial[];
  quizHistory: QuizResult[];
  activeMaterialId: string | null;
  addMaterial: (material: LearningMaterial) => void;
  removeMaterial: (id: string) => void;
  updateMaterialSummary: (id: string, summary: string) => void;
  updateMaterialNotes: (id: string, notes: SmartNotes) => void;
  updateMaterialAssessments: (id: string, assessments: AssessmentQuestion[]) => void;
  addQuizResult: (result: QuizResult) => void;
  setActiveMaterialId: (id: string | null) => void;
}