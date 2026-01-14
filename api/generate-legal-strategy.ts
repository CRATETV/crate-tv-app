
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, title, director, isGrantMode } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const grantPrompt = `
        You are the Head of Philanthropic Selection at Crate TV. 
        We are drafting a high-stakes "Godfather Offer" for the film: "${title}" ${director ? `directed by ${director}` : ''}.
        
        THE OFFER (The Crate TV Sundance Premiere Package):
        1. Official Submission Stipend: Crate TV will provide a $100.00 USD stipend to cover the film's official submission fee to the Sundance Film Festival 2026.
        2. Revenue Split: For the one-night Live Premiere Watch Party on Crate TV, the filmmaker retains 70% of all ticket sales and community donations.
        3. Non-Exclusive: This is a one-night community event. The filmmaker keeps 100% of their rights for the festival circuit and maintains premiere eligibility elsewhere.
        
        THE ASK:
        The film will be hosted for a "Live Premiere Watch Party" in "The Square" (our community-led stage). This event positions the film as a local champion before its festival run.
        
        TONE:
        Professional, high-status, and patron-centric. Suggest that we are "underwriting their success" and "investing in the cinematic underground." 
        
        Format: A formal executive letter from Crate TV Studio. Explicitly mention the $100 stipend and the 70/30 split.
    `;

    const licensingPrompt = `
        You are the Head of Acquisitions for Crate TV. 
        We want to secure the streaming rights for the film: "${title}" ${director ? `directed by ${director}` : ''}.
        Draft a prestigious, filmmaker-first inquiry. 
        Focus on the 70/30 Patronage Loop and the "Distribution Afterlife" narrative.
    `;

    const prompt = isGrantMode ? grantPrompt : licensingPrompt;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
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
