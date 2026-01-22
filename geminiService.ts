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
        console.error("Failed to parse extracted JSON:", e2);
      }
    }
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing. Since you added it to Vercel, please trigger a NEW DEPLOYMENT for the environment variables to take effect.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a high-quality food image for a given recipe title.
 */
export const generateAIImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional, high-resolution food photography shot of ${prompt}. Gourmet presentation on a clean plate, natural lighting, soft bokeh background, delicious and appetizing.` }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
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
    // Final fallback to a reliable Unsplash food image if AI fails
    return `https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800`;
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800`;
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
  Do not include markdown headers. Output ONLY JSON.`;

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
    
    // Generate real images for each recipe in parallel
    const recipesWithImages = await Promise.all(results.map(async (r: any) => {
      const image = await generateAIImage(r.title);
      return {
        ...r,
        id: r.id || Math.random().toString(36).substr(2, 9),
        image
      };
    }));

    return recipesWithImages;
  } catch (error: any) {
    console.error("Gemini Recipe Generation Error:", error);
    throw error;
  }
};