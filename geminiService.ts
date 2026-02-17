
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences } from "./types.ts";

const extractJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON block:", e2);
      }
    }
    // Fallback manual slice
    const firstBracket = Math.min(
      text.indexOf('[') === -1 ? Infinity : text.indexOf('['),
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{')
    );
    const lastBracket = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    
    if (firstBracket !== Infinity && lastBracket !== -1) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch (e3) {
        throw new Error("AI returned invalid JSON format. Please try again.");
      }
    }
    throw new Error("Could not find recipe data in AI response.");
  }
};

export const generateAIImage = async (prompt: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 10000);
  const fallback = `https://image.pollinations.ai/prompt/professional%20food%20photography%20of%20${encodeURIComponent(prompt)}?width=800&height=800&seed=${seed}&model=flux`;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A vibrant gourmet plated food shot of ${prompt}. Pro lighting, 4k.` }],
      },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    return fallback;
  } catch (error) {
    console.warn("Image gen failed:", error);
    return fallback;
  }
};

const fullRecipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    prepTime: { type: Type.STRING },
    cookTime: { type: Type.STRING },
    servings: { type: Type.NUMBER },
    calories: { type: Type.STRING },
    matchPercentage: { type: Type.NUMBER },
    difficulty: { type: Type.STRING },
    ingredients: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { name: { type: Type.STRING }, amount: { type: Type.STRING } },
        required: ["name", "amount"]
      } 
    },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    nutrition: {
      type: Type.OBJECT,
      properties: { protein: { type: Type.STRING }, carbs: { type: Type.STRING }, fats: { type: Type.STRING } },
      required: ["protein", "carbs", "fats"]
    }
  },
  required: ["title", "description", "prepTime", "cookTime", "ingredients", "steps", "difficulty", "nutrition", "calories", "matchPercentage"]
};

export const generateRecipesFromPantry = async (ingredients: string[], prefs: UserPreferences): Promise<Recipe[]> => {
  if (ingredients.length === 0) return [];
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate 3 creative gourmet recipes using: ${ingredients.join(', ')}. 
    Dietary preferences: ${prefs.dietType}. 
    Allergies to avoid: ${prefs.allergies.join(', ') || 'None'}.
    User Skill Level: ${prefs.skillLevel}.`;

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
    
    // Parallelize image generation for speed
    const recipePromises = results.map(async (r: any) => {
      const image = await generateAIImage(r.title);
      return {
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        image
      };
    });

    return await Promise.all(recipePromises);
  } catch (error: any) {
    console.error("Recipe Generation Error:", error);
    throw error;
  }
};
