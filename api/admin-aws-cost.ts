// Admin → Overview → "AWS bill" card (top admin only).
//   POST { password }                → { configured, summary } or { configured, error }
//   POST { password, refresh: true } → asks AWS again (AWS charges about 1 cent per ask)
// Answers are kept for 6 hours so opening the dashboard costs nothing.
import { isMasterAdmin } from './_lib/adminAuth.js';
import { billingClient, fetchAwsCost, friendlyAwsError, type AwsCostSummary } from './_lib/awsCost.js';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const KEEP_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; summary: AwsCostSummary | null } | null = null;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can see the AWS bill.' }, 401);
        const client = billingClient();
        if (!client) return json({ configured: false, error: 'No AWS key is set up on the server.' });
        if (!body.refresh && cache && Date.now() - cache.at < KEEP_MS) return json({ configured: true, summary: cache.summary });
        try {
            const summary = await fetchAwsCost(client);
            cache = { at: Date.now(), summary };
            return json({ configured: true, summary });
        } catch (e) {
            console.error('admin-aws-cost: AWS refused or failed:', (e as any)?.name, (e as any)?.message);
            return json({ configured: true, error: friendlyAwsError(e) });
        }
    } catch (e) {
        console.error('admin-aws-cost failed:', e);
        return json({ error: 'Could not read the AWS bill.' }, 500);
    }
}
