/**
 * ROBOTS PROTOCOL
 * Path: /api/robots.ts
 * Rewritten from: /robots.txt
 */
export async function GET(request: Request) {
    const host = request.headers.get('host') || 'cratetv.net';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /portal
Disallow: /account

Sitemap: ${protocol}://${host}/sitemap.xml
`;

    return new Response(content, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, s-maxage=86400'
        }
    });
}