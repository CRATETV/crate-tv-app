// api/update-submission-status.ts
// General-purpose status updater for pipeline entries.
// Currently used by the "Hold for Consideration" button.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { submissionId, status, password } = await request.json();

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
        if (!anyPasswordSet) isAuthenticated = true;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!submissionId || !status) {
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

        await db.collection('movie_pipeline').doc(submissionId).update({
            status,
            updatedAt: FieldValue.serverTimestamp(),
        });

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
