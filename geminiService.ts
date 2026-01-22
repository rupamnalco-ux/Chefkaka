import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences, MealPlan, DayOfWeek, MealSlot } from "./types.ts";

/**
 * Robust JSON extraction. 
 * Gemini often wraps responses in markdown blocks like ```json ... ```
 */
const extractJSON = (text: string) => {
  try {
    // Attempt standard parse first
    return JSON.parse(text);
  } catch (e) {
    // If it fails, try to extract content between triple backticks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
      }
    }
    // Final fallback: try to find the first '[' or '{' and last ']' or '}'
    const firstBracket = Math.min(
      text.indexOf('[') === -1 ? Infinity : text.indexOf('['),
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{')
    );
    const lastBracket = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    
    if (firstBracket !== Infinity && lastBracket !== -1) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch (e3) {
        throw new Error("Could not extract valid JSON from response");
      }
    }
    throw e;
  }
};

const getAI = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  if (!apiKey) {
    console.error("CRITICAL: API_KEY is missing from Environment Variables!");
  }
  return new GoogleGenAI({ apiKey });
};

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

const getFastPlaceholder = (query: string) => {
  return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(query)}`;
};

export const generateAIImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional food photography shot of ${prompt}. Gourmet presentation, white plate, bokeh background.` }],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" },
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return getFastPlaceholder(prompt);
  } catch (error) {
    console.error("Image generation failed:", error);
    return getFastPlaceholder(prompt);
  }
};

const fullRecipeSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    prepTime: { type: Type.STRING },
    cookTime: { type: Type.STRING },
    servings: { type: Type.NUMBER },
    calories: { type: Type.STRING },
    matchPercentage: { type: Type.NUMBER },
    difficulty: { type: Type.STRING, enum: ["Easy", "Med", "Hard"] },
    ingredients: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING },
          amount: { type: Type.STRING }
        },
        required: ["name", "amount"]
      } 
    },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.STRING },
        carbs: { type: Type.STRING },
        fats: { type: Type.STRING }
      },
      required: ["protein", "carbs", "fats"]
    }
  },
  required: ["title", "description", "prepTime", "cookTime", "ingredients", "steps", "difficulty", "nutrition"]
};

export const generateRecipesFromPantry = async (ingredients: string[], prefs: UserPreferences): Promise<Recipe[]> => {
  if (ingredients.length === 0) return [];
  
  const ai = getAI();
  const prompt = `Return strictly a JSON array of 3 creative recipes using these ingredients: ${ingredients.join(', ')}. 
  Diet: ${prefs.dietType}. Allergies: ${prefs.allergies.join(', ') || 'None'}. Level: ${prefs.skillLevel}. 
  Do not include markdown headers or conversational text. Output ONLY the JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: fullRecipeSchema
        }
      }
    });

    const results = extractJSON(response.text || "[]");
    
    return results.map((r: any) => ({
      ...r,
      id: r.id || Math.random().toString(36).substr(2, 9),
      image: `https://loremflickr.com/800/600/food,cooked,${encodeURIComponent(r.title)}`
    }));
  } catch (error: any) {
    console.error("Gemini Recipe Generation Error:", error);
    throw error;
  }
};

export const generateWeeklyPlan = async (ingredients: string[], prefs: UserPreferences): Promise<MealPlan> => {
  const ai = getAI();
  const prompt = `Return strictly a JSON object for a 7-day meal plan (21 meals total). 
  Pantry: ${ingredients.join(', ')}. Diet: ${prefs.dietType}. 
  Do not include markdown headers. Output ONLY JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, enum: DAYS },
                  slot: { type: Type.STRING, enum: SLOTS },
                  recipe: fullRecipeSchema
                },
                required: ["day", "slot", "recipe"]
              }
            }
          }
        }
      }
    });

    const data = extractJSON(response.text || "{\"meals\":[]}");
    const plan: MealPlan = {
      Monday: { Breakfast: null, Lunch: null, Dinner: null },
      Tuesday: { Breakfast: null, Lunch: null, Dinner: null },
      Wednesday: { Breakfast: null, Lunch: null, Dinner: null },
      Thursday: { Breakfast: null, Lunch: null, Dinner: null },
      Friday: { Breakfast: null, Lunch: null, Dinner: null },
      Saturday: { Breakfast: null, Lunch: null, Dinner: null },
      Sunday: { Breakfast: null, Lunch: null, Dinner: null },
    };

    if (data.meals && Array.isArray(data.meals)) {
      for (const item of data.meals) {
        if (item.day && item.slot && item.recipe) {
          const r = item.recipe;
          plan[item.day as DayOfWeek][item.slot as MealSlot] = {
            ...r,
            id: r.id || Math.random().toString(36).substr(2, 9),
            image: `https://loremflickr.com/400/300/food,${encodeURIComponent(r.title)}`,
            tags: r.tags || ['Planned']
          } as Recipe;
        }
      }
    }
    return plan;
  } catch (error: any) {
    console.error("Gemini Weekly Plan Error:", error);
    throw error;
  }
};