// api/update-submission-status.ts
// General-purpose status updater for pipeline entries.
// Currently used by the "Hold for Consideration" button.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
    try {
        const { submissionId, status, password: __raw_password, reviewNotes } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;

        if (password && (password === primaryAdminPassword || password === masterPassword)) {
            isAuthenticated = true;
        } else if (password) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD;
        // SECURITY: removed "setup mode" — a missing ADMIN_PASSWORD env var used to
        // unlock this endpoint for everyone. Now a missing password just means locked.
        void anyPasswordSet;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        // 'approved' and 'catalog' are intentionally NOT settable here — those go
        // through approve-film-submission.ts / add-to-catalog.ts, which also
        // create the movie record and email the filmmaker.
        const ALLOWED_STATUSES = ['pending', 'submitted', 'consideration', 'rejected'];
        if (status && !ALLOWED_STATUSES.includes(status)) {
            return new Response(JSON.stringify({ error: `Unknown status "${status}"` }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!submissionId || (!status && typeof reviewNotes !== 'string')) {
            return new Response(JSON.stringify({ error: 'submissionId and status are required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const initError = getInitializationError();
        if (initError) {
            return new Response(JSON.stringify({ error: initError }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        const db = getAdminDb();
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database unavailable' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        const update: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
        if (status) {
            update.status = status;
            update.isReviewed = status !== 'pending' && status !== 'submitted';
        }
        if (typeof reviewNotes === 'string') update.reviewNotes = reviewNotes.slice(0, 5000);

        await db.collection('movie_pipeline').doc(submissionId).update(update);

        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('update-submission-status error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
