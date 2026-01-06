import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, title, director } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are the Head of Acquisitions for Crate TV. 
        We want to secure the streaming rights for the film: "${title}" ${director ? `directed by ${director}` : ''}.
        
        This film is currently on Vimeo but not on our platform.
        Draft a prestigious, filmmaker-first inquiry to the rights holder (director or production company).
        
        Proposal Points:
        1. Crate TV is the "Distribution Afterlife" for festival champions.
        2. We offer a Roku-enabled 1080p exhibition platform.
        3. 70/30 Patronage Loop: Filmmakers keep 70% of all direct community support.
        4. Non-exclusive agreement: They keep 100% of their copyright.
        
        Tone: Sophisticated, industrial, and highly professional.
        Format: A professional email draft.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return new Response(JSON.stringify({ proposal: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Legal Core Offline." }), { status: 500 });
  }
}