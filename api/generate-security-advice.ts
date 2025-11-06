import { GoogleGenAI, Type } from '@google/genai';
import { SecurityReport, AiSecurityAdvice } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password, report } = (await request.json()) as { password: string, report: SecurityReport };

    // --- Authentication & Validation ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }
    if (!report) {
        return new Response(JSON.stringify({ error: 'A security report is required to generate advice.' }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are a cybersecurity analyst for a small indie film streaming service called Crate TV.
      You have received the following security report for activity in the last 24 hours:

      - Total Events Logged: ${report.totalEvents}
      - Events by Type: ${JSON.stringify(report.eventsByType, null, 2)}
      - Suspicious IP Addresses (more than 5 events): ${JSON.stringify(report.suspiciousIps, null, 2)}

      Based on this data, provide a brief, easy-to-understand summary of the current threat level and a list of actionable recommendations.
      The recommendations should be specific and prioritized. For example, if you see many FAILED_ADMIN_LOGIN events from one IP, recommend blocking that IP.
      If you see many FAILED_PAYMENT events, warn about potential card testing fraud.
      Your response must be a JSON object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: {
                        type: Type.STRING,
                        description: "A brief, one-paragraph summary of the security situation."
                    },
                    recommendations: {
                        type: Type.ARRAY,
                        description: "A list of concrete, actionable steps the admin should take.",
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
    
    const advice = JSON.parse(response.text || '{}');

    return new Response(JSON.stringify({ advice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating security advice:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate advice: ${errorMessage}` }), { status: 500 });
  }
}