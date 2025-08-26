// api/feed-mrss.ts

// This is a Vercel Serverless Function
// It will be accessible at the path /api/feed-mrss
// It generates a Media RSS (MRSS) feed for TV platforms.

import { moviesData, categoriesData, Movie } from './_lib/data.ts';

// Helper function to escape characters for XML
const escapeXml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
};

// Helper to strip HTML from synopsis
const stripHtml = (html: string) => html ? html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '') : '';

// Helper to create a valid date object, falling back to now()
const getValidDate = (dateString?: string): Date => {
    if (!dateString) return new Date();
    // Replace hyphens with slashes for better cross-browser compatibility before parsing
    const date = new Date(dateString.replace(/-/g, '/'));
    if (isNaN(date.getTime())) {
        console.warn(`Invalid releaseDate format found: "${dateString}". Falling back to current date.`);
        return new Date();
    }
    return date;
};


export async function GET(request: Request) {
    try {
        // Reliably construct the base URL from headers, as request.url can be relative.
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        
        if (!host) {
            throw new Error("Could not determine the host from request headers.");
        }
        
        const baseUrl = `${protocol}://${host}`;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Crate TV</title>
    <link>${baseUrl}</link>
    <description>A sleek and professional streaming web application for discovering and watching independent films.</description>
    <language>en-US</language>
    <pubDate>${new Date().toUTCString()}</pubDate>
`;

        const allMovies: Movie[] = Object.values(moviesData);

        for (const movie of allMovies) {
            const movieUrl = `${baseUrl}/movie/${movie.key}`;
            const synopsis = stripHtml(movie.synopsis);
            const pubDate = getValidDate(movie.releaseDate).toUTCString();

            const tags = Object.values(categoriesData)
                .filter(cat => cat.movieKeys.includes(movie.key))
                .map(cat => cat.title)
                .join(', ');

            // Default duration to 10 minutes (600 seconds) unless specified
            let duration = 600; 
            if (movie.key === 'streeteatstheboot') {
                duration = 3240;
            }

            xml += `
    <item>
      <title>${escapeXml(movie.title)}</title>
      <link>${escapeXml(movieUrl)}</link>
      <guid isPermaLink="false">${escapeXml(movie.key)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(synopsis)}</description>
      <media:content 
        url="${escapeXml(movie.fullMovie)}" 
        type="video/mp4" 
        medium="video" 
        duration="${duration}" 
        isDefault="true" />
      <media:title>${escapeXml(movie.title)}</media:title>
      <media:description type="plain">${escapeXml(synopsis)}</media:description>
      <media:thumbnail url="${escapeXml(movie.poster)}" />
      <media:keywords>${escapeXml(tags)}</media:keywords>
`;
            // Add director(s)
            if (movie.director) {
                const directors = movie.director.split(',').map(d => d.trim());
                directors.forEach(d => {
                    if (d) xml += `      <media:credit role="director">${escapeXml(d)}</media:credit>\n`;
                });
            }

            // Add cast
            movie.cast.forEach(actor => {
                xml += `      <media:credit role="actor">${escapeXml(actor.name)}</media:credit>\n`;
            });

            xml += `    </item>
`;
        }

        xml += `  </channel>
</rss>`;

        return new Response(xml, {
            status: 200,
            headers: { 
                'Content-Type': 'application/rss+xml; charset=utf-8',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error('Error generating MRSS feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(`<error>${escapeXml(errorMessage)}</error>`, {
            status: 500,
            headers: { 'Content-Type': 'application/xml' },
        });
    }
}
