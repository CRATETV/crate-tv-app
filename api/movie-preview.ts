// api/movie-preview.ts
//
// SOCIAL SHARE PREVIEWS FOR FILMS + WATCH PARTIES
// Mounted at /movie/:key and /watchparty/:key via vercel.json rewrites.
//
// Crate is a single-page app, so every URL used to return the same generic
// <meta> tags. Facebook, Instagram DMs, X, iMessage, WhatsApp, Slack etc.
// never run the JavaScript that sets per-film tags — so every time a
// filmmaker shared their film, the preview showed the Crate logo instead of
// their poster and title. That's the single most-shared link type on the
// platform, and it was the least compelling preview.
//
// Same approach as zine-preview.ts:
//   • link-preview crawlers → a tiny HTML page with the film's real
//     og:title / og:description / og:image (the poster)
//   • real visitors → the normal app shell, completely unchanged

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const BOT_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|iMessage|Googlebot|bingbot|vkShare|SkypeUriPreview|Embedly|Google-PageRenderer|Instagram/i;

const escapeHtml = (str: unknown) =>
    String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const shell = async (origin: string) => {
    const res = await fetch(`${origin}/index.html`);
    return new Response(await res.text(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const key = (url.searchParams.get('key') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const kind = url.searchParams.get('kind') === 'watchparty' ? 'watchparty' : 'movie';
    const host = request.headers.get('host') || 'cratetv.net';
    const origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
    const pageUrl = `${origin}/${kind}/${key}`;
    const isBot = BOT_UA_PATTERN.test(request.headers.get('user-agent') || '');

    if (!isBot || !key) {
        try { return await shell(origin); }
        catch { return Response.redirect(`${origin}/`, 302); }
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline');

        // Published catalog lives in data/movies (a map keyed by movie key);
        // fall back to the per-movie collection.
        let movie: any = (await db.collection('data').doc('movies').get()).data()?.[key];
        if (!movie) {
            const doc = await db.collection('movies').doc(key).get();
            movie = doc.exists ? doc.data() : null;
        }
        if (!movie || movie.isUnlisted) return await shell(origin);

        const filmTitle = String(movie.title || 'Crate TV');
        const title = kind === 'watchparty'
            ? `🍿 Watch Party: ${filmTitle} | Crate TV`
            : `${filmTitle}${movie.director ? ` — dir. ${movie.director}` : ''} | Crate TV`;
        const description = String(movie.synopsis || 'Stream independent film on Crate TV.')
            .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
        const image = movie.poster || movie.tvPoster || `${origin}/favicon-512x512.png`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="video.movie" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:site_name" content="Crate TV" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="canonical" href="${escapeHtml(pageUrl)}" />
</head>
<body>
<h1>${escapeHtml(filmTitle)}</h1>
<p>${escapeHtml(description)}</p>
<a href="${escapeHtml(pageUrl)}">Watch on Crate TV</a>
</body>
</html>`;

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('[movie-preview] failed:', error);
        try { return await shell(origin); }
        catch { return Response.redirect(`${origin}/`, 302); }
    }
}
