import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * Executes a Gemini API call with exponential jittered backoff retry logic.
 * Optimized for both Free and Paid tiers to mitigate rate limits (RPM/TPM).
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 4
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // CRITICAL: Always create a new instance right before the call
    // to ensure we pick up the latest API key injected into the environment.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Look for 429 (Rate Limit) or 8 (Resource Exhausted - gRPC code)
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("RESOURCE_EXHAUSTED") ||
                           errorMessage.includes("limit") ||
                           errorMessage.includes("Quota exceeded") ||
                           errorMessage.includes(" 8 ") || 
                           errorMessage.startsWith("8 ");

      if (isQuotaError) {
          if (attempt < maxRetries) {
              // Exponential Backoff with Jitter
              const baseDelay = Math.pow(2.2, attempt + 1) * 1000;
              const jitter = Math.random() * 1000;
              const totalDelay = baseDelay + jitter;
              
              console.warn(`[Gemini] Rate limited. Attempt ${attempt + 1}. Retrying in ${totalDelay.toFixed(0)}ms...`);
              await new Promise(resolve => setTimeout(resolve, totalDelay));
              continue;
          }
          const passiveError = new Error("AI intelligence nodes at peak capacity. Changes committed, but insights skipped.");
          (passiveError as any).isQuotaError = true;
          throw passiveError;
      }

      if (errorMessage.includes("Requested entity was not found.")) {
          const keyError = new Error("API Key configuration error. Please re-verify settings in AI Studio.");
          (keyError as any).isKeyError = true;
          throw keyError;
      }

      // Retry on 503 (Service Unavailable)
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