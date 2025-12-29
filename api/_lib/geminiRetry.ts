import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * Executes a Gemini API call with exponential backoff retry logic.
 * Specifically targets 429 (Resource Exhausted) and code 8 errors.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 3
): Promise<GenerateContentResponse> {
  // Always create a new instance right before making an API call 
  // to ensure we pick up the latest process.env.API_KEY injected by window.aistudio.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Look for code 8 or RESOURCE_EXHAUSTED or 429 in the error message
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("limit") ||
                           errorMessage.includes("Quota exceeded") ||
                           errorMessage.includes("RESOURCE_EXHAUSTED") ||
                           errorMessage.includes("8") ||
                           errorMessage.includes("Resource exhausted");

      if (isQuotaError) {
          if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt + 1) * 1000;
              console.warn(`Gemini limit hit. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          // Wrap as a passive error that won't crash callers
          const passiveError = new Error("AI Service temporarily reached its limit.");
          (passiveError as any).isQuotaError = true;
          throw passiveError;
      }

      // Handle Key Specific Errors as per instructions
      if (errorMessage.includes("Requested entity was not found.")) {
          const keyError = new Error("API Key configuration error. Please re-select your key.");
          (keyError as any).isKeyError = true;
          throw keyError;
      }

      if (errorMessage.includes("503") && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}