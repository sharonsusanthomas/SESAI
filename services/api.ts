import axios, { AxiosInstance } from 'axios';

// API base URL - change this for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const authAPI = {
  /**
   * Initiate Google OAuth login
   */
  googleLogin: async () => {
    const response = await api.get('/auth/google');
    return response.data;
  },

  /**
   * Handle OAuth callback (called by backend redirect)
   */
  handleCallback: async (code: string) => {
    const response = await api.get(`/auth/callback?code=${code}`);
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return response.data;
  },
};

// ==================== MATERIALS API ====================

export const materialsAPI = {
  /**
   * Upload a learning material file
   */
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/materials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * List all materials for current user
   */
  list: async () => {
    const response = await api.get('/api/materials');
    return response.data;
  },

  /**
   * Get a specific material
   */
  getById: async (id: string) => {
    const response = await api.get(`/api/materials/${id}`);
    return response.data;
  },

  /**
   * Delete a material
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/materials/${id}`);
    return response.data;
  },
};

// ==================== SMART NOTES API ====================

export const notesAPI = {
  /**
   * Generate smart notes for a material
   */
  generate: async (materialId: string) => {
    const response = await api.post(`/api/notes/generate/${materialId}`);
    return response.data;
  },

  /**
   * Get smart notes for a material
   */
  get: async (materialId: string) => {
    const response = await api.get(`/api/notes/${materialId}`);
    return response.data;
  },
};

// ==================== QUIZ API ====================

export const quizAPI = {
  /**
   * Generate quiz questions
   */
  generate: async (params: {
    material_id: string;
    difficulty: string;
    question_type?: string;
    count?: number;
  }) => {
    const response = await api.post('/api/quiz/generate', params);
    return response.data;
  },

  /**
   * Submit quiz answers
   */
  submit: async (params: {
    material_id: string;
    difficulty: string;
    quiz_type: string;
    questions: any[];
    user_answers: any[];
  }) => {
    const response = await api.post('/api/quiz/submit', params);
    return response.data;
  },

  /**
   * Get quiz history
   */
  history: async () => {
    const response = await api.get('/api/quiz/history');
    return response.data;
  },

  /**
   * Get a specific quiz result
   */
  getResult: async (quizId: string) => {
    const response = await api.get(`/api/quiz/${quizId}`);
    return response.data;
  },
};

// ==================== TUTOR API ====================

export const tutorAPI = {
  /**
   * Chat with AI Tutor
   */
  chat: async (params: {
    messages: { role: string; text: string }[];
    material_id?: string;
    context?: string;
  }) => {
    const response = await api.post('/api/tutor/chat', params);
    return response.data;
  },

  /**
   * Evaluate answer
   */
  evaluate: async (params: {
    question: string;
    user_answer: string;
    model_answer: string;
    max_marks: number;
  }) => {
    const response = await api.post('/api/tutor/evaluate', params);
    return response.data;
  },
};

// ==================== ANALYTICS API ====================

export const analyticsAPI = {
  /**
   * Get user statistics
   */
  getStats: async () => {
    const response = await api.get('/api/analytics/stats');
    return response.data;
  },

  /**
   * Get learning progress
   */
  getProgress: async () => {
    const response = await api.get('/api/analytics/progress');
    return response.data;
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Set authentication token
 */
export const setAuthToken = (token: string) => {
  localStorage.setItem('access_token', token);
};

/**
 * Get authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('access_token');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Clear authentication
 */
export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

export default api;
