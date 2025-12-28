import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { name, bio } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Actor name and bio are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    const db = getAdminDb();
    const actorSlug = slugify(name);

    // 1. CHECK CACHE FIRST (Save money/quota)
    if (!initError && db) {
        try {
            const profileDoc = await db.collection('actor_profiles').doc(actorSlug).get();
            if (profileDoc.exists) {
                const data = profileDoc.data();
                if (data?.cachedAiFact) {
                    console.log(`[AI Cache] Returning stored fact for ${name}`);
                    return new Response(JSON.stringify({ fact: data.cachedAiFact, cached: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            }
        } catch (cacheErr) {
            console.warn("[AI Cache] Check failed, proceeding to live generation", cacheErr);
        }
    }

    // 2. GENERATE NEW FACT
    const prompt = `Generate a single, interesting, and little-known fun fact about the actor ${name}. Their provided biography is: "${bio}". The fact should be short, engaging, and suitable for a movie app. Do not start the fact with their name. For example, instead of saying "${name} once did...", say "Once did...". The fact should be a single, concise sentence.`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        const fact = response.text || "Highly versatile performer known for deep character work.";

        // 3. SAVE TO CACHE (Store for future free use)
        if (!initError && db) {
            await db.collection('actor_profiles').doc(actorSlug).set({
                cachedAiFact: fact,
                lastAiUpdate: new Date()
            }, { merge: true }).catch(e => console.error("[AI Cache] Save failed", e));
        }

        return new Response(JSON.stringify({ fact }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    } catch (apiError: any) {
        if (apiError.message?.includes('429') || apiError.message?.includes('limit')) {
            return new Response(JSON.stringify({ 
                fact: "Crate TV's AI is popular! We've hit our daily discovery limit. Check back soon for more facts.",
                isQuotaError: true 
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
        }
        throw apiError;
    }
  } catch (error) {
    console.error('Error generating fun fact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return new Response(JSON.stringify({ error: `Failed to generate fun fact: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}