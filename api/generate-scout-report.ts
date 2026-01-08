import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { actorId } = await request.json();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 });
    }

    if (!actorId) {
        return new Response(JSON.stringify({ error: 'Actor ID is required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Infrastructure offline.");

    // Verify Industry Pro Claim
    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    // Allow if isIndustryPro OR if it's the primary admin
    const isAuthorized = userData?.isIndustryPro || decodedToken.email === 'cratetiv@gmail.com' || userData?.isFilmmaker;
    
    if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Access restricted to Industry Terminals.' }), { status: 403 });
    }

    // 1. Fetch Actor Profile
    const actorDoc = await db.collection('actor_profiles').doc(actorId).get();
    if (!actorDoc.exists) {
        return new Response(JSON.stringify({ error: 'Talent node not found.' }), { status: 404 });
    }
    const actor = actorDoc.data()!;

    // 2. Fetch Movies for context
    const moviesSnapshot = await db.collection('movies').get();
    const movies: any[] = [];
    moviesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cast && data.cast.some((c: any) => c.name.toLowerCase() === actor.name.toLowerCase())) {
            movies.push({ title: data.title, director: data.director, likes: data.likes });
        }
    });

    const prompt = `
        You are a World-Class Talent Scout and Distribution Consultant for "Crate TV", an elite independent film infrastructure.
        Synthesize a Discovery Intelligence Report for the following Talent Node:
        
        TALENT NAME: ${actor.name}
        BIOGRAPHY: "${actor.bio}"
        RELEVANT CATALOG ENTRIES: ${JSON.stringify(movies)}
        
        OBJECTIVE:
        1. Calculate a "Discovery Readiness Score" (0-99) based on current performance pedigree and market fit.
        2. Identify "Performance DNA" tags (e.g., "Method-Driven", "High Emotional Range", "Action-Capable").
        3. Provide a "Market Fit" summary (e.g., "Ready for Mid-Tier Indie Leads").
        4. Draft an "Acquisition Strategy" for distribution partners considering this talent.
        5. Provide "Institutional Comparables" (Modern established actors with similar energy).
        
        FORMAT: Respond ONLY in valid JSON.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    report: {
                        type: Type.OBJECT,
                        properties: {
                            potentialScore: { type: Type.NUMBER },
                            marketFit: { type: Type.STRING },
                            performanceDna: { type: Type.ARRAY, items: { type: Type.STRING } },
                            acquisitionStrategy: { type: Type.STRING },
                            comparables: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["potentialScore", "marketFit", "performanceDna", "acquisitionStrategy", "comparables"]
                    }
                },
                required: ["report"]
            }
        }
    });

    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Discovery Intelligence Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
