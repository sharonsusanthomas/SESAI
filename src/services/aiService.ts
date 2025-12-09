import { notesAPI, quizAPI, tutorAPI } from './api';
import { Question, QuizLevel, QuestionType, SmartNotes } from '../types';

// --- AI Service Functions ---

/**
 * Generate structured smart notes for a material
 */
export const generateSmartNotes = async (materialId: string): Promise<SmartNotes> => {
    try {
        const response = await notesAPI.generate(materialId);
        return response.notes_data;
    } catch (error) {
        console.error("Smart Notes Generation Error:", error);
        throw error;
    }
};

/**
 * Ask the AI tutor a question
 */
export const askTutor = async (history: { role: 'user' | 'model', text: string }[], newQuestion: string, materialId?: string): Promise<string> => {
    try {
        const response = await tutorAPI.chat({
            messages: history,
            material_id: materialId
        });
        return response.response;
    } catch (error) {
        console.error("Chat Error:", error);
        return "Sorry, I encountered an error answering that.";
    }
};

/**
 * Ask the AI tutor a question with strict context checks
 */
export const askStrictTutor = async (history: { role: 'user' | 'model', text: string }[], newQuestion: string, materialId?: string): Promise<string> => {
    // Using standard chat for now, can be upgraded to specific strict endpoint later
    return askTutor(history, newQuestion, materialId);
};

/**
 * Generate advanced quiz questions
 */
export const generateAdvancedQuestions = async (
    materialId: string,
    level: QuizLevel,
    type: QuestionType,
    count: number
): Promise<Question[]> => {
    try {
        const response = await quizAPI.generate({
            material_id: materialId,
            difficulty: level,
            question_type: type,
            count: count
        });
        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error("Advanced Quiz generation error:", error);
        throw new Error("Failed to generate quiz.");
    }
};

/**
 * Helper to generate a simple quiz
 */
export const generateQuiz = async (materialId: string, level: QuizLevel): Promise<Question[]> => {
    return generateAdvancedQuestions(materialId, level, 'multiple-choice', 5);
};

/**
 * Evaluate a student's open-ended answer
 */
export const evaluateAnswer = async (
    question: string,
    userAnswer: string,
    modelAnswer: string,
    maxMarks: number
): Promise<{ score: number; feedback: string }> => {
    try {
        const response = await tutorAPI.evaluate({
            question,
            user_answer: userAnswer,
            model_answer: modelAnswer,
            max_marks: maxMarks
        });
        return response;
    } catch (error) {
        console.error("Evaluation Error:", error);
        return { score: 0, feedback: "Failed to evaluate answer." };
    }
};
