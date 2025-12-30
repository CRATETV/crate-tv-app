import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * ELITE RETRY ENGINE V5.1
 * Specifically hardened for Error 8 (Resource Exhausted) on Paid Tiers.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 5
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // CRITICAL: Re-instantiate client per attempt to ensure clean environmental state
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // ERROR 8 / 429 DETECTION
      // Code 8 is 'Resource Exhausted'. On paid tiers, this is typically 
      // a Requests Per Minute (RPM) threshold rather than a daily cap.
      const isTransientLimit = 
          errorMessage.includes("429") || 
          errorMessage.includes("RESOURCE_EXHAUSTED") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("limit") ||
          errorMessage.includes(" 8 ") || 
          errorMessage.startsWith("8 ");

      if (isTransientLimit) {
          if (attempt < maxRetries) {
              // FOR PAID TIERS: Jittered exponential backoff clears the RPM bucket
              const baseDelay = Math.pow(2.2, attempt + 1) * 1000;
              const jitter = Math.random() * 1000; 
              const totalDelay = baseDelay + jitter;
              
              console.warn(`[Crate AI] Throttled (Attempt ${attempt + 1}/${maxRetries}). Retrying in ${totalDelay.toFixed(0)}ms...`);
              await new Promise(resolve => setTimeout(resolve, totalDelay));
              continue;
          }
          
          // Custom error flag for UI handling
          const finalError = new Error("AI nodes are at peak capacity. Database record saved, enrichment deferred.");
          (finalError as any).isQuotaError = true;
          (finalError as any).code = 8;
          throw finalError;
      }

      // 503 SERVICE UNAVAILABLE
      if (errorMessage.includes("503") && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}