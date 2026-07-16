import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

/**
 * SOCIAL SHARE PREVIEW FOR THE UNPACK
 * Path: /api/zine-preview.ts (mounted at /zine/:id via vercel.json rewrite)
 *
 * The app is a single-page app — every route serves the same static
 * index.html, and the real per-story <meta> tags only get written in by
 * SEO.tsx after React hydrates. Facebook, Twitter/X, Slack, iMessage, etc.
 * never run that JS — they just read whatever <meta> tags are in the raw
 * HTML response, so every shared story was showing the same generic site
 * logo instead of its own image.
 *
 * Fix: this function sits in front of every /zine/:id request.
 *  - Known crawler user-agents get a tiny static HTML document with the
 *    correct og:title / og:description / og:image for that specific story.
 *  - Everyone else (real visitors) gets the normal app shell, unchanged.
 */

const BOT_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|iMessage|Googlebot|bingbot|vkShare|SkypeUriPreview|Embedly|Google-PageRenderer/i;

const escapeHtml = (str: string) =>
    String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';
    const host = request.headers.get('host') || 'cratetv.net';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const pageUrl = `${protocol}://${host}/zine/${id}`;
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_UA_PATTERN.test(userAgent);

    // Real visitor: pass through to the normal SPA shell, exactly what the
    // old catch-all rewrite used to serve for this URL.
    if (!isBot) {
        try {
            const shellRes = await fetch(`${protocol}://${host}/index.html`);
            const shellHtml = await shellRes.text();
            return new Response(shellHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } catch (error) {
            console.error('Zine preview shell fetch failed:', error);
            return Response.redirect(`${protocol}://${host}/zine`, 302);
        }
    }

    // Crawler: serve a minimal document with the real story's OG tags.
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline');

        const doc = await db.collection('editorial_stories').doc(id).get();
        if (!doc.exists) {
            return new Response('Not found', { status: 404 });
        }

        const story = doc.data() as any;
        const title = `${story.title || 'The Unpack'} | Crate TV`;
        const rawDescription = story.subtitle || story.content || '';
        const description = rawDescription.replace(/<[^>]+>/g, '').slice(0, 160);
        const image = story.heroImage || 'https://cratetv.net/favicon-512x512.png';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:site_name" content="Crate TV" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
<a href="${escapeHtml(pageUrl)}">${escapeHtml(story.title || 'Read on The Unpack')}</a>
</body>
</html>`;

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
            }
        });
    } catch (error) {
        console.error('Zine share preview failure:', error);
        // Never show crawlers (or a stray human who slips through) a hard
        // error — fall back to the plain app shell instead.
        try {
            const shellRes = await fetch(`${protocol}://${host}/index.html`);
            const shellHtml = await shellRes.text();
            return new Response(shellHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } catch {
            return Response.redirect(`${protocol}://${host}/zine`, 302);
        }
    }
}
