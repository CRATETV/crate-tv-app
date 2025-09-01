// api/feed-mrss.ts

// This is a Vercel Serverless Function
// It will be accessible at the path /api/feed-mrss
// It generates a Media RSS (MRSS) feed for TV platforms.
import { moviesData } from '../constants.ts';

const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

export default function handler(req: any, res: any) {
    try {
        const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, ' ') : '';
        const baseUrl = `https://${req.headers.host}`;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dcterms="http://purl.org/dc/terms/">
  <channel>
    <title>Crate TV</title>
    <link>${baseUrl}</link>
    <description>A collection of independent short films from Crate TV.</description>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
`;

        for (const movie of Object.values(moviesData)) {
            const synopsisText = stripHtml(movie.synopsis);
            const pubDate = movie.releaseDate ? new Date(movie.releaseDate).toUTCString() : new Date().toUTCString();

            const directors = movie.director.split(',').map(d => d.trim()).filter(Boolean);

            xml += `
    <item>
      <title>${escapeXml(movie.title)}</title>
      <link>${baseUrl}/movie/${movie.key}</link>
      <guid isPermaLink="true">${baseUrl}/movie/${movie.key}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(synopsisText)}</description>
      <media:content url="${escapeXml(movie.fullMovie)}" type="video/mp4" medium="video" isDefault="true" expression="full" duration="600" />
      <media:description type="plain">${escapeXml(synopsisText)}</media:description>
      <media:thumbnail url="${escapeXml(movie.tvPoster || movie.poster)}" />
      ${movie.cast.map(actor => `<media:credit role="actor" scheme="urn:ebu">${escapeXml(actor.name)}</media:credit>`).join('\n      ')}
      ${directors.map(director => `<media:credit role="director" scheme="urn:ebu">${escapeXml(director)}</media:credit>`).join('\n      ')}
    </item>`;
        }

        xml += `
  </channel>
</rss>`;

        res.setHeader('Content-Type', 'application/rss+xml');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
        res.status(200).send(xml);

    } catch (error) {
        console.error('Error generating MRSS feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to generate feed: ${errorMessage}` });
    }
}