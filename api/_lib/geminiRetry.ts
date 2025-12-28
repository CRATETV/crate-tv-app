import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * Executes a Gemini API call with exponential backoff retry logic.
 * Specifically targets 429 (Resource Exhausted) errors and 503 errors.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 3
): Promise<GenerateContentResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Check for 429 Resource Exhausted, 8 RESOURCE_EXHAUSTED, or 503 Service Unavailable
      const isRetryable = errorMessage.includes("429") || 
                          errorMessage.includes("503") || 
                          errorMessage.includes("Quota exceeded") ||
                          errorMessage.includes("RESOURCE_EXHAUSTED") ||
                          errorMessage.includes("Resource exhausted") ||
                          errorMessage.includes("limit");

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Gemini limit hit (Attempt ${attempt + 1}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or we've reached max retries, throw the error
      throw error;
    }
  }

  throw lastError;
}