import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, title } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are a Legal Distribution Auditor for Crate TV. 
        Analyze the film title: "${title}".
        
        Perform a deep search to determine if this film is:
        1. Public Domain (Ancient or abandoned copyright)
        2. Creative Commons (Specifically look for CC-BY on Vimeo or YouTube)
        3. Standard Copyright (Restricted distribution)
        
        Identify the primary rights holder (Production Company or Director).
        
        Format as JSON:
        {
            "audit": {
                "title": "Verified Title",
                "director": "Director Name",
                "year": "Release Year",
                "status": "RESTRICTED" | "ELIGIBLE" | "ACQUISITION_TARGET",
                "licenseType": "License Name",
                "rightsHolder": "Entity Name",
                "explanation": "Precise summary of legal status.",
                "sources": [ { "title": "Source Site", "url": "Direct URL" } ]
            }
        }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    audit: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            director: { type: Type.STRING },
                            year: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["RESTRICTED", "ELIGIBLE", "ACQUISITION_TARGET"] },
                            licenseType: { type: Type.STRING },
                            rightsHolder: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            sources: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        url: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Legal analysis failed." }), { status: 500 });
  }
}