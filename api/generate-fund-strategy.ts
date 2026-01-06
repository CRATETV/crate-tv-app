import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, fundName } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const isEpicTarget = fundName.toLowerCase().includes('epic');
    const isPhillyTarget = fundName.toLowerCase().includes('philly') || fundName.toLowerCase().includes('philadelphia');

    const prompt = `
        You are a Strategic Development Consultant for Crate TV. 
        Crate TV is a high-density media distribution platform for independent cinema based in Philadelphia.
        
        GOAL: Secure a strategic partnership or institutional grant from "${fundName}" for 2025.
        
        IDENTITY PROOFS:
        - Handle: @cratetv.philly (Active community engagement)
        - Location: Philadelphia-based core infrastructure.
        - Objective: Create a "Permanent Vault" for local and specialized cinema.
        
        CRITICAL SHIFT:
        Do NOT pitch a single movie. Pitch Crate TV as a HUB, AGGREGATOR, and INFRASTRUCTURE PARTNER.
        
        ${isEpicTarget ? `
        EPIC MEGAGRANTS SPECIFIC FOCUS:
        1. Pitch Crate TV as the "Distribution Pipeline for Unreal Engine Cinematics."
        2. Explain that Epic needs a 'Retail Layer' where filmmakers using Unreal can actually exhibit and monetize their work professionally (Roku, Web).
        3. Propose hosting a specific "Unreal Engine Spotlight" category on Crate TV to promote 3D-heavy independent films.
        4. Focus on 'Enhancing the Open Ecosystem' by providing a professional afterlife for 3D content creators.
        ` : ''}

        Pitch Requirements:
        1. ${isPhillyTarget ? 'FOCUS HEAVILY on the "Philadelphia Root" narrative. Crate TV is the city\'s own media lifeboat.' : 'Frame Crate TV as an "Authenticity Funnel" and "Distribution Afterlife" on a global scale.'}
        2. Propose a "Crate x ${fundName} Collection" where their grant money is used to license/fund 10 films from their circuit for permanent exhibition on Crate.
        3. Highlight the 70/30 Patronage Loop (Creators keep 70% of support/rentals).
        4. Mention the custom Roku SDK and V4 Cloud Infrastructure as "Ready-to-Deploy" distribution.
        5. Mention @cratetv.philly as evidence of an established audience bridge.
        
        INSTRUCTIONS:
        Use Google Search grounding to find the ACTUAL 2025 strategic priorities for "${fundName}" (e.g. "Community impact," "Equity," "Technological Innovation").
        Align the pitch perfectly with those found keywords.
        
        Format your response as a professional, high-stakes partnership proposal.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    
    return new Response(JSON.stringify({ strategy: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Institutional intelligence failed." }), { status: 500 });
  }
}