import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { SecurityEvent, SecurityReport } from '../types.js';

const SUSPICIOUS_IP_THRESHOLD = 5; // An IP is suspicious if it generates this many events in 24 hours
const FAILED_LOGIN_WARN_THRESHOLD = 10;
const FAILED_PAYMENT_WARN_THRESHOLD = 20;


export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // --- Fetch Events ---
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const eventsSnapshot = await db.collection('security_events')
            .where('timestamp', '>=', twentyFourHoursAgo)
            .orderBy('timestamp', 'desc')
            .limit(500) // Limit to prevent overwhelming data
            .get();

        const recentEvents: SecurityEvent[] = [];
        eventsSnapshot.forEach(doc => {
            recentEvents.push({ id: doc.id, ...doc.data() } as SecurityEvent);
        });

        // --- Analyze Data ---
        const eventsByType: Record<string, number> = {};
        const eventsByIp: Record<string, { count: number; types: Set<string> }> = {};

        for (const event of recentEvents) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            if (event.ip) {
                if (!eventsByIp[event.ip]) {
                    eventsByIp[event.ip] = { count: 0, types: new Set() };
                }
                eventsByIp[event.ip].count++;
                eventsByIp[event.ip].types.add(event.type);
            }
        }

        const suspiciousIps = Object.entries(eventsByIp)
            .filter(([_, data]) => data.count >= SUSPICIOUS_IP_THRESHOLD)
            .map(([ip, data]) => ({
                ip,
                count: data.count,
                types: Array.from(data.types),
            }))
            .sort((a, b) => b.count - a.count);

        // --- Determine Threat Level ---
        let threatLevel: 'red' | 'yellow' | 'green';
        if (suspiciousIps.length > 0) {
            threatLevel = 'red';
        } else if (
            (eventsByType['FAILED_ADMIN_LOGIN'] || 0) > FAILED_LOGIN_WARN_THRESHOLD ||
            (eventsByType['FAILED_PAYMENT'] || 0) > FAILED_PAYMENT_WARN_THRESHOLD
        ) {
            threatLevel = 'yellow';
        } else {
            threatLevel = 'green';
        }

        const report: SecurityReport = {
            totalEvents: recentEvents.length,
            eventsByType,
            suspiciousIps,
            recentEvents: recentEvents.slice(0, 50), // Return only the 50 most recent for display
            threatLevel,
        };

        return new Response(JSON.stringify(report), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error generating security report:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}