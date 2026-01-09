import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * CRATE AI RESILIENCE ENGINE V7.0
 * Specialized for Quota Management (Status 8 / 429).
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 5
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Fresh client instance to ensure latest env state
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Detection for Quota/Rate limits (Status 429 or Internal Error 8)
      const isQuotaError = 
          errorMessage.includes("429") || 
          errorMessage.includes("RESOURCE_EXHAUSTED") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("limit") ||
          errorMessage.includes(" 8 ") || 
          errorMessage.startsWith("8 ") ||
          error.code === 8;

      if (isQuotaError) {
          if (attempt < maxRetries) {
              // Wait longer on each attempt: 2s, 8s, 18s, 32s...
              const delay = Math.pow(attempt + 1, 2) * 2000 + (Math.random() * 1000);
              console.warn(`[Crate AI] Quota Exhausted (Error 8). Re-syncing in ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          
          // If we exhausted retries, throw a specific error the API routes can catch
          const finalError = new Error("AI Capacity Reached");
          (finalError as any).isQuotaError = true;
          throw finalError;
      }
      
      throw error;
    }
  }

  throw lastError;
}