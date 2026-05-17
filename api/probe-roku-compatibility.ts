
export async function POST(request: Request) {
    try {
        const { url, password } = await request.json();
        
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!url) return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 });

        // 1. Perform a HEAD request to check for Byte-Range support (CRITICAL for Roku 8s start)
        const headRes = await fetch(url, {
            method: 'HEAD',
            headers: { 'Range': 'bytes=0-1024' }
        });

        const contentType = headRes.headers.get('content-type') || 'unknown';
        const acceptRanges = headRes.headers.get('accept-ranges');
        const status = headRes.status;

        // 2. Perform a partial GET to check for moov atom (FastStart)
        // If the moov atom isn't in the first 32kb, the app will hang while downloading the whole file.
        const partialRes = await fetch(url, {
            headers: { 'Range': 'bytes=0-32768' }
        });
        const buffer = await partialRes.arrayBuffer();
        const headerHex = Array.from(new Uint8Array(buffer.slice(0, 100)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // '6d6f6f76' is hex for 'moov'
        const hasMoovEarly = headerHex.includes('6d6f6f76');

        // 3. Determine compatibility score
        let score = 100;
        let findings = [];

        if (status !== 206 && url.toLowerCase().endsWith('.mp4')) {
            score -= 60;
            findings.push("CRITICAL: Server rejected Range request (Status " + status + "). The Roku app will wait for the full download before playing, violating Requirement 3.6.");
        }

        if (!hasMoovEarly && url.toLowerCase().endsWith('.mp4')) {
            score -= 40;
            findings.push("WARNING: 'moov' atom not found in first 32kb. Roku hardware must download significant metadata before initiation, risking the 8-second limit.");
        }

        if (url.startsWith('http://')) {
            score -= 40;
            findings.push("SECURITY: Insecure protocol. Roku OS requires HTTPS for production HLS streams.");
        }

        let ffmpegHint = "";
        if (score < 100) {
            ffmpegHint = `ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4`;
        }

        return new Response(JSON.stringify({
            score,
            status: score >= 80 ? 'OPTIMAL' : score >= 40 ? 'WARNING' : 'CRITICAL',
            details: {
                contentType,
                byteRangeSupport: status === 206,
                fastStartReady: hasMoovEarly,
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
