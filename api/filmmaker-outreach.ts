import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { action, query, mode, filmmaker, emailData } = await req.json();

    // ── ACTION: SEARCH — find filmmakers or CC films via Claude + web search ──
    if (action === 'search') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
            return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500 });
        }

        const systemPrompt = mode === 'cc'
            ? `You are a researcher finding Creative Commons licensed films that could be hosted on Crate TV, an independent streaming platform. 
               Search for films released under Creative Commons licenses on platforms like Vimeo, Internet Archive, YouTube, and film school showcases.
               For each film found, identify: title, director name, director email or contact link, license type (CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND), 
               the film URL, genre, year, and a brief description.
               Return results as a JSON array. Focus on high quality short films and features from independent filmmakers.
               Only include films where you can verify the CC license.`
            : `You are a talent scout for Crate TV, an independent streaming platform that gives filmmakers free exposure.
               Search for independent filmmakers who would benefit from exposure — film school graduates, festival submitters, 
               short film directors, first-time feature directors. Look on Vimeo, FilmFreeway, film school showcases, and festival websites.
               For each filmmaker found, identify: name, email or contact link, film title, film URL, genre, brief bio, 
               why they would want exposure over payment (student, debut film, festival circuit etc).
               Return results as a JSON array with fields: name, email, filmTitle, filmUrl, genre, bio, reason, contactSource.
               Focus on filmmakers actively seeking distribution and exposure.`;

        const userPrompt = mode === 'cc'
            ? `Search for Creative Commons films matching this description: "${query}". Find real films with verified CC licenses. Return as JSON array.`
            : `Search for independent filmmakers matching this description: "${query}". Find real filmmakers actively sharing work. Return as JSON array.`;

        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 4000,
                    system: systemPrompt,
                    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
                    messages: [{ role: 'user', content: userPrompt }],
                }),
            });

            const data = await res.json();
            
            // Extract text from response
            const textContent = data.content
                ?.filter((b: any) => b.type === 'text')
                ?.map((b: any) => b.text)
                ?.join('\n') || '';

            // Try to parse JSON from the response
            let results = [];
            const jsonMatch = textContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    results = JSON.parse(jsonMatch[0]);
                } catch {
                    results = [];
                }
            }

            return new Response(JSON.stringify({ success: true, results, raw: textContent }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Search failed', details: String(err) }), { status: 500 });
        }
    }

    // ── ACTION: DRAFT — generate a personalized outreach email ──
    if (action === 'draft') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
            return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500 });
        }

        const prompt = filmmaker.licenseType
            ? `Draft a warm, genuine outreach email to a filmmaker about hosting their Creative Commons film on Crate TV.
               Film: "${filmmaker.filmTitle}" by ${filmmaker.name}
               License: ${filmmaker.licenseType}
               Genre: ${filmmaker.genre || 'Independent'}
               Keep it short (3-4 short paragraphs), personal, and genuine. 
               Mention their specific film by name. Explain Crate TV briefly — independent streaming platform, free exposure, Roku TV reach.
               Be honest that we don't offer payment but emphasize the genuine audience exposure.
               Sign off from "The Crate TV Team". Return only the email body, no subject line.`
            : `Draft a warm, genuine outreach email to an independent filmmaker about uploading their film to Crate TV.
               Filmmaker: ${filmmaker.name}
               Film: "${filmmaker.filmTitle}"
               Genre: ${filmmaker.genre || 'Independent'}
               Background: ${filmmaker.reason || 'Independent filmmaker seeking exposure'}
               Keep it short (3-4 short paragraphs), personal, conversational. Not corporate.
               Mention their specific film. Explain Crate TV — independent streaming platform, Roku TV reach, free global exposure.
               Be upfront that we don't offer payment but make clear this is about genuine exposure and community.
               Sign off from "The Crate TV Team". Return only the email body, no subject line.`;

        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await res.json();
            const draft = data.content?.[0]?.text || '';

            return new Response(JSON.stringify({ success: true, draft }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Draft failed' }), { status: 500 });
        }
    }

    // ── ACTION: SEND — send the outreach email via Resend ──
    if (action === 'send') {
        if (!emailData?.to || !emailData?.body) {
            return new Response(JSON.stringify({ error: 'Missing email data' }), { status: 400 });
        }

        try {
            await resend.emails.send({
                from: 'Crate TV <studio@cratetv.net>',
                to: emailData.to,
                subject: emailData.subject || `Your film on Crate TV — ${emailData.filmTitle || 'Invitation'}`,
                html: `
                    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.7; font-size: 15px;">
                        <div style="border-bottom: 2px solid #E50914; padding-bottom: 20px; margin-bottom: 28px;">
                            <span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 13px; letter-spacing: 0.3em; color: #E50914;">CRATE TV</span>
                        </div>
                        ${emailData.body.replace(/\n/g, '<br>')}
                        <div style="border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 20px; font-size: 12px; color: #888; font-family: Arial, sans-serif;">
                            <p>Crate TV · cratetv.net · Independent streaming for independent film</p>
                            <p>To opt out of future messages, reply with "unsubscribe".</p>
                        </div>
                    </div>
                `,
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Send failed', details: String(err) }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
}
