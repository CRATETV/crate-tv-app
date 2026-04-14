/**
 * Simple in-memory rate limiter for API endpoints.
 * Resets per Vercel serverless function instance.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
        requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
        return true; // allowed
    }

    if (record.count >= maxRequests) {
        return false; // blocked
    }

    record.count++;
    return true; // allowed
}

export function getIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           'unknown';
}
