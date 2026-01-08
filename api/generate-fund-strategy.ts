import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, fundName, isClosed } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const isPhillyTarget = fundName.toLowerCase().includes('philly') || fundName.toLowerCase().includes('philadelphia');
    const isPCF = fundName.toLowerCase().includes('cultural fund');
    const isIPMF = fundName.toLowerCase().includes('independence public media');

    const prompt = `
        You are a Strategic Development Consultant for Crate TV. 
        Crate TV is a high-density media distribution platform for independent cinema based in Philadelphia.
        
        GOAL: Secure a strategic partnership, grant, or technical credits from "${fundName}" for 2025/2026.
        
        IDENTITY PROOFS (USE AS LEVERAGE):
        - Hub City: Philadelphia, PA (Local roots are vital for this specific target).
        - Core Mission: Provide an "Elite Afterlife" for independent films that usually die after the festival circuit.
        - Strategic Loop: The 70/30 Patronage Loop (Creators keep 70% of support). This is a "Social Impact" metric.
        - SUBSIDY STATUS: Already backed by AWS Activate ($1,000 credits secured Jan 2025). Use this as proof of technical vetting.
        
        ${isPhillyTarget ? `
        PHILADELPHIA REGIONAL STRATEGY:
        1. LOCAL IMPACT: Frame Crate TV as a tool for the "Economic Sustainability of Philadelphia Artists."
        2. COMMUNITY: Focus on how Crate provides a permanent professional stage for local creators who are often priced out of major streaming platforms.
        3. ACCESSIBILITY: Mention our Roku SDK as a way to bring Philly-made culture directly into local living rooms.
        ${isPCF ? 'Focus on the "Service to the Field" category—how Crate TV serves the wider arts community as a whole.' : ''}
        ${isIPMF ? 'Focus on "Media Innovation" and "Access to Storytelling Tools" for marginalized or independent voices.' : ''}
        ` : ''}

        ${isClosed ? `
        STRATEGIC MODE: PREPARATION (Window Currently Closed)
        Generate a "Preparation Manifesto" for "${fundName}".
        Include:
        1. ASSET CHECKLIST: 5 specific media or technical assets Crate TV should produce now (e.g. "Philly Creator Impact Case Study").
        2. NETWORK STRATEGY: How to engage with Philadelphia arts commissioners or foundation directors before the window opens.
        3. LOCAL DATA TARGETS: How many Philly-based films we should have in the catalog by the start date.
        ` : `
        STRATEGIC MODE: PROPOSAL (Window Active)
        Draft a high-stakes, professional partnership proposal document.
        `}

        Pitch Requirements for all targets:
        1. ${isPhillyTarget ? 'FOCUS HEAVILY on the "Philadelphia Root" narrative.' : 'Frame Crate TV as an "Authenticity Funnel" and "Distribution Afterlife" on a global scale.'}
        2. Highlight the 70/30 Patronage Loop (Creators keep 70%).
        3. Mention the custom Roku SDK and V4 Cloud Infrastructure as "Ready-to-Deploy" distribution.
        
        INSTRUCTIONS:
        Use Google Search grounding to find the ACTUAL 2025/2026 strategic priorities for "${fundName}".
        Align the prep or proposal perfectly with those found keywords (e.g., "Diversity," "Digital Literacy," "Economic Opportunity").
        
        Format your response as a professional manifest or proposal document.
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