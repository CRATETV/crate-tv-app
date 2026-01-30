
export async function POST(request: Request) {
    try {
        const { url, password } = await request.json();
        
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!url) return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 });

        // 1. Perform a HEAD request to check for Byte-Range support (CRITICAL for Roku MP4s)
        const headRes = await fetch(url, {
            method: 'HEAD',
            headers: { 'Range': 'bytes=0-1024' }
        });

        const contentType = headRes.headers.get('content-type') || 'unknown';
        const acceptRanges = headRes.headers.get('accept-ranges');
        const status = headRes.status;

        // 2. Determine compatibility score
        let score = 100;
        let findings = [];
        let needsTranscode = false;

        if (status !== 206 && url.toLowerCase().endsWith('.mp4')) {
            score -= 60;
            findings.push("Server rejected Range request (Status " + status + "). Roku hardware will hang at 0%.");
        }

        if (acceptRanges !== 'bytes' && url.toLowerCase().endsWith('.mp4')) {
            score -= 20;
            findings.push("Server does not explicitly advertise 'bytes' support.");
        }

        if (!url.startsWith('https://')) {
            score -= 40;
            findings.push("Insecure protocol. Roku OS requires strict TLS handshakes.");
        }

        // Suggestions for fixing
        let ffmpegHint = "";
        if (score < 100) {
            ffmpegHint = `ffmpeg -i input.mp4 -c:v libx264 -profile:v high -level:4.1 -pix_fmt yuv420p -movflags +faststart output_roku.mp4`;
        }

        return new Response(JSON.stringify({
            score,
            status: score >= 80 ? 'OPTIMAL' : score >= 40 ? 'WARNING' : 'CRITICAL',
            details: {
                contentType,
                byteRangeSupport: status === 206,
                protocol: url.startsWith('https') ? 'Secure' : 'Insecure'
            },
            findings,
            ffmpegHint
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Uplink timed out. Verify the URL is public and CORS-enabled." }), { status: 500 });
    }
}
