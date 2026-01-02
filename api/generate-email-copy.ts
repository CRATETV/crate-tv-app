import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, templatePrompt, festivalTitle, festivalDates, recentMovies } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const context = `
        Current Event: ${festivalTitle || 'N/A'}
        Dates: ${festivalDates || 'N/A'}
        Recent Content: ${recentMovies || 'N/A'}
    `;

    const prompt = `You are a copywriter for Crate TV. ${templatePrompt}. Context: ${context}. Write a cinematic, elite subject and a professional HTML body (styled for dark mode, using red #ef4444 accents). Respond in JSON.`;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    htmlBody: { type: Type.STRING }
                },
                required: ["subject", "htmlBody"]
            }
        }
    });
    
    return new Response(response.text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}