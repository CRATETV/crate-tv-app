import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * ELITE RETRY ENGINE V5.3
 * Hardened for Paid Tiers and Free Quotas. 15 Retry Cycle.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 15
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Fresh client instance per call to ensure API key propagation
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      const isTransientLimit = 
          errorMessage.includes("429") || 
          errorMessage.includes("RESOURCE_EXHAUSTED") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("limit") ||
          errorMessage.includes(" 8 ") || 
          errorMessage.startsWith("8 ");

      if (isTransientLimit) {
          if (attempt < maxRetries) {
              // Quadratic Backoff with Jitter
              const baseDelay = Math.pow(attempt + 1, 2) * 1000;
              const jitter = Math.random() * 2000; 
              const totalDelay = baseDelay + jitter;
              
              console.warn(`[Crate AI] Resource Exceeded (Error 8). Retrying ${attempt + 1}/${maxRetries} in ${totalDelay.toFixed(0)}ms...`);
              await new Promise(resolve => setTimeout(resolve, totalDelay));
              continue;
          }
          
          const finalError = new Error("AI services are at peak capacity. Database update was successful, but AI generation is deferred.");
          (finalError as any).isQuotaError = true;
          (finalError as any).code = 8;
          throw finalError;
      }

      if ((errorMessage.includes("503") || errorMessage.includes("overloaded")) && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}