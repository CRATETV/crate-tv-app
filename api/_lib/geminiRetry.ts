import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { getAdminDb } from './firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * CRATE AI RESILIENCE ENGINE V9.0
 * Specialized for Quota Monitoring & Burst Protection.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 5
): Promise<GenerateContentResponse> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Create a fresh instance to ensure the most recent API key state
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
          // Log breach to system health collection for the Daily Pulse to see
          try {
              const db = getAdminDb();
              if (db) {
                  await db.collection('system_health').add({
                      type: 'AI_QUOTA_BREACH',
                      model: params.model,
                      timestamp: FieldValue.serverTimestamp(),
                      attempt: attempt + 1,
                      severity: attempt >= 3 ? 'CRITICAL' : 'WARNING'
                  });
              }
          } catch (logErr) {
              console.error("Failed to log system health event:", logErr);
          }

          if (attempt < maxRetries) {
              // Wait significantly longer on each attempt to allow the 1-minute window to reset
              // Attempt 1: ~3s, Attempt 2: ~9s, Attempt 3: ~19s
              const delay = Math.pow(attempt + 2, 2) * 1000 + (Math.random() * 1000);
              console.warn(`[Crate Infrastructure] API Throttled (Error 8). Re-syncing node in ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          
          const finalError = new Error("API_CAPACITY_EXHAUSTED");
          (finalError as any).isQuotaError = true;
          throw finalError;
      }
      
      throw error;
    }
  }

  throw lastError;
}