import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

/**
 * DYNAMIC SITEMAP GENERATOR V1.0
 * Path: /api/sitemap.ts
 * Rewritten from: /sitemap.xml
 */
export async function GET(request: Request) {
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("Database offline");

        const host = request.headers.get('host') || 'cratetv.net';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        // Fetch all dynamic content nodes
        const [moviesSnap, actorsSnap, storiesSnap] = await Promise.all([
            db.collection('movies').where('isUnlisted', '==', false).get(),
            db.collection('actor_profiles').get(),
            db.collection('editorial_stories').get()
        ]);

        const staticPages = [
            '',
            '/public-square',
            '/actors-directory',
            '/zine',
            '/about',
            '/submit',
            '/top-ten'
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // 1. Add Static Pages
        staticPages.forEach(page => {
            xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`;
        });

        // 2. Add Movies
        moviesSnap.forEach(doc => {
            xml += `
  <url>
    <loc>${baseUrl}/movie/${doc.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        // 3. Add Actors
        actorsSnap.forEach(doc => {
            xml += `
  <url>
    <loc>${baseUrl}/actors-directory/${doc.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        // 4. Add Zine Stories
        storiesSnap.forEach(doc => {
            xml += `
  <url>
    <loc>${baseUrl}/zine/${doc.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        xml += `
</urlset>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
            }
        });

    } catch (error) {
        console.error("Sitemap generation failure:", error);
        return new Response('Error generating sitemap', { status: 500 });
    }
}