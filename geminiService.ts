
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

/**
 * Generates a high-quality food image for a given recipe title using Gemini.
 */
export const generateAIImage = async (prompt: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 10000);
  const fallback = `https://image.pollinations.ai/prompt/professional%20food%20photography%20of%20${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux`;
  
  try {
    // Correctly initialize right before the call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional food photography shot of ${prompt}. Gourmet presentation, vibrant colors, bokeh background, 4k.` }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        // Find the image part in the response
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    return fallback;
  } catch (error) {
    console.warn("Gemini Image Generation failed, falling back to Pollinations:", error);
    return fallback;
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

/**
 * Uses Gemini to generate recipes based on provided ingredients and user preferences.
 */
export const generateRecipesFromPantry = async (ingredients: string[], prefs: UserPreferences): Promise<Recipe[]> => {
  if (ingredients.length === 0) return [];
  
  try {
    // Correctly initialize right before the call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Return strictly a JSON array of 3 creative recipes using these ingredients: ${ingredients.join(', ')}. 
    Diet: ${prefs.dietType}. Allergies: ${prefs.allergies.join(', ') || 'None'}. Level: ${prefs.skillLevel}. 
    Do not include markdown headers. Output ONLY JSON.`;

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

    // Directly access .text property as per extraction rules
    const results = extractJSON(response.text || "[]");
    
    const recipes: Recipe[] = [];
    for (const r of results) {
      // Small delay to prevent rate limiting during sequential image generation
      await new Promise(resolve => setTimeout(resolve, 100));
      const image = await generateAIImage(r.title);
      recipes.push({
        ...r,
        id: r.id || Math.random().toString(36).substr(2, 9),
        image
      });
    }

    return recipes;
  } catch (error: any) {
    console.error("Gemini Recipe Generation Error:", error);
    throw error;
  }
};
