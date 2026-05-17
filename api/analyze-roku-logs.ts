
import { generateContentWithRetry } from './_lib/geminiRetry.js';
import { Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { password, logs } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    if (password !== primaryAdminPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are an expert Roku Debugger. Analyze these Telnet logs:
        
        "${logs}"

        Identify the specific BrightScript or XML error.
        Provide:
        1. A summary of why it crashed.
        2. The exact line of code that is likely causing the issue.
        3. A corrected code snippet in BrightScript.

        Format as JSON:
        {
            "analysis": {
                "summary": "string",
                "faultyLine": "string",
                "codeFix": "string"
            }
        }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            faultyLine: { type: Type.STRING },
                            codeFix: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    });
    
    return new Response(response.text, { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Analysis failed." }), { status: 500 });
  }
}
