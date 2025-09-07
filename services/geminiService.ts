
import { GoogleGenAI } from "@google/genai";
import { Magazine } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development. In a real environment, the key should be set.
  console.warn("API_KEY environment variable not set. Gemini features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getTaskSuggestion = async (newMagazines: Magazine[]): Promise<string> => {
  if (!API_KEY) {
    return "Display new magazines on the front rack.";
  }

  const magazineTitles = newMagazines.map(m => m.title).join(', ');
  const prompt = `You are a helpful high school librarian assistant. A student volunteer just started their shift. Suggest a specific, actionable, and useful task they can do in the library. Keep it concise (1-2 sentences). New magazines that just arrived: ${magazineTitles || 'None'}.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 50,
        }
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error fetching task suggestion from Gemini:", error);
    return "Error generating task. Please ask the librarian for a task.";
  }
};
   