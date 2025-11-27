import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizLevel, QuestionType, AIResponseData, SmartNotes, AssessmentQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to truncate text to a safe limit. Gemini 2.5 Flash has a large context window (1M tokens),
// but we set a safe limit for text inputs to avoid unnecessary latency or limits.
const truncateContent = (content: string, maxLength: number = 500000): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "\n...[Content Truncated]...";
};

// Helper to identify and parse base64 image data
const parseImageData = (content: string): { mimeType: string; data: string } | null => {
  const match = content.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
};

// --- Core Functions ---

export const generateSummary = async (content: string, type: 'text' | 'image' | 'pdf' | 'audio'): Promise<string> => {
  try {
    const imageData = parseImageData(content);
    let response;

    if (imageData) {
       response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: imageData },
            { text: "Summarize this learning material clearly and concisely (approx 100 words)." }
          ]
        }
       });
    } else {
      const safeContent = truncateContent(content, 50000);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert academic tutor. Summarize the following learning material clearly and concisely (approx 100 words).\n\nContent:\n${safeContent}`
      });
    }

    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("Summary error:", error);
    return "Summary generation failed.";
  }
};

export const processDocument = async (content: string): Promise<AIResponseData> => {
  try {
    const imageData = parseImageData(content);
    const safeContent = imageData ? "" : truncateContent(content);
    
    const parts: any[] = [];
    if (imageData) {
      parts.push({ inlineData: imageData });
      parts.push({ text: "Analyze this study material." });
    } else {
      parts.push({ text: `Analyze this content:\n\n${safeContent}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: `You are an expert educational AI assistant. 
      Analyze the provided study material completely.
      
      Your tasks:
      1. Extract the core knowledge, identifying key concepts, definitions, and hierarchical relationships.
      2. Generate comprehensive study notes including a summary, bullet points, detailed section breakdowns, and key term definitions.
      3. Create a conceptual hierarchy (mind map structure).
      4. Generate a set of 10 assessment questions (MCQs) covering various difficulty levels (Easy, Medium, Hard) to test understanding.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            notes: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedNotes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      heading: { type: Type.STRING },
                      content: { type: Type.STRING }
                    }
                  }
                },
                definitions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING }
                    }
                  }
                },
                mindMap: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      topic: { type: Type.STRING },
                      subtopics: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                }
              }
            },
            assessments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                  type: { type: Type.STRING, enum: ["MCQ"] }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from AI");
    return JSON.parse(jsonText) as AIResponseData;

  } catch (error) {
    console.error("Process Document Error:", error);
    throw new Error("Failed to process document.");
  }
};

export const generateSmartNotes = async (content: string): Promise<SmartNotes> => {
  const data = await processDocument(content);
  return data.notes;
};

export const askTutor = async (history: {role: 'user' | 'model', text: string}[], newQuestion: string, contextContent?: string): Promise<string> => {
  try {
    const imageData = contextContent ? parseImageData(contextContent) : null;
    let safeContext = "No specific material selected.";
    
    if (contextContent && !imageData) {
      safeContext = truncateContent(contextContent, 100000);
    } else if (imageData) {
      safeContext = "Image content provided in context.";
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a helpful tutor. The user is asking questions about the provided study document.
        Answer the user's question clearly and concisely based ONLY on the document provided.
        If the answer isn't in the document, say so.`
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const parts: any[] = [];
    if (imageData) {
       parts.push({ inlineData: imageData });
    }
    parts.push({ text: `Context: ${safeContext}\n\nQuestion: ${newQuestion}` });

    const response = await chat.sendMessage({ message: parts });
    return response.text || "Sorry, I encountered an error answering that.";

  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I encountered an error answering that.";
  }
};

export const generateAdvancedQuestions = async (
  content: string, 
  level: QuizLevel, 
  type: QuestionType, 
  count: number
): Promise<Question[]> => {
  try {
    const imageData = parseImageData(content);
    const safeContent = imageData ? "Image content provided." : truncateContent(content);

    const parts: any[] = [];
    if (imageData) parts.push({ inlineData: imageData });
    parts.push({ text: `Generate ${count} ${type} questions based on the content. Difficulty: ${level}.\nContent: ${safeContent}` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: "You are a professor creating exam questions. Output strictly valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  type: { type: Type.STRING },
                  text: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  modelAnswer: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned");
    const parsed = JSON.parse(jsonText);
    return parsed.questions || [];

  } catch (error) {
    console.error("Advanced Quiz generation error:", error);
    throw new Error("Failed to generate quiz.");
  }
};

export const generateQuiz = async (content: string, level: QuizLevel): Promise<Question[]> => {
  return generateAdvancedQuestions(content, level, 'multiple-choice', 5);
};

export const askStrictTutor = async (history: {role: 'user' | 'model', text: string}[], newQuestion: string, contextContent?: string): Promise<string> => {
  try {
    const imageData = contextContent ? parseImageData(contextContent) : null;
    let safeContext = "No context provided.";
    
    if (contextContent && !imageData) {
      safeContext = truncateContent(contextContent, 100000);
    } else if (imageData) {
      safeContext = "Image content provided.";
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a Strict Context Bot. You answer questions based EXCLUSIVELY on the provided context material.
        If the user asks something that is not covered in the context, you must reply: "I cannot find this information in the provided notes."
        Do not use external knowledge.
        
        Context: ${safeContext}`
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const parts: any[] = [];
    if (imageData) parts.push({ inlineData: imageData });
    parts.push({ text: newQuestion });

    const response = await chat.sendMessage({ message: parts });
    return response.text || "I cannot answer this.";

  } catch (error) {
    console.error("Strict Chat Error:", error);
    return "Error processing strict context request.";
  }
};
