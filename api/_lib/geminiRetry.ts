import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * ELITE RETRY ENGINE V5.2
 * Hardened for Paid Tiers. 10 Retry Cycle.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 10
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Fresh client instance per call
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
              // Linear-Exponential Hybrid Backoff
              const baseDelay = (attempt < 3) ? 1000 : Math.pow(2, attempt) * 1000;
              const jitter = Math.random() * 1000; 
              const totalDelay = baseDelay + jitter;
              
              console.warn(`[Crate AI] Paid Tier Throttled (Attempt ${attempt + 1}/${maxRetries}). Backing off ${totalDelay.toFixed(0)}ms...`);
              await new Promise(resolve => setTimeout(resolve, totalDelay));
              continue;
          }
          
          const finalError = new Error("AI nodes are at peak capacity. Please retry the operation in 30 seconds.");
          (finalError as any).isQuotaError = true;
          (finalError as any).code = 8;
          throw finalError;
      }

      if (errorMessage.includes("503") && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}