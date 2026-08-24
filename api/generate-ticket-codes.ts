import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';

// Server-side counterpart to the admin "Ticket Codes" tab's code generation.
// The client used to addDoc() straight to `ticket_codes` from the browser —
// same category of bug as unlockFestivalBlock/purchaseMovie/unlockWatchParty
// before their fixes: firestore.rules has no rule for `ticket_codes` at all,
// so every write fell through to the deny-all catch-all and silently failed
// with "Failed to generate codes." This mirrors the same admin-password
// pattern used by terminate-watch-party.ts and writes with the Admin SDK,
// which isn't subject to client security rules.

function generateCodeString(type: string): string {
    const prefix = type === 'full_pass' ? 'PASS' : type === 'day_pass' ? 'DAY' : 'BLK';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I/L)
    let random = '';
    for (let i = 0; i < 6; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CRATE-${prefix}-${random}`;
}

export async function POST(request: Request) {
    try {
        const {
            password,
            codeType,
            codeCount,
            selectedDay,
            selectedBlockId,
            blockTitle,
            recipientEmail,
            recipientName,
            notes,
        } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        } else {
            const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
            if (!collabSnap.empty) isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!['full_pass', 'day_pass', 'block'].includes(codeType)) {
            return new Response(JSON.stringify({ error: 'Invalid code type.' }), { status: 400 });
        }
        const count = Math.min(Math.max(parseInt(codeCount, 10) || 1, 1), 100);

        const generatedCodes: string[] = [];
        const batch = db.batch();
        const codesRef = db.collection('ticket_codes');

        for (let i = 0; i < count; i++) {
            const codeString = generateCodeString(codeType);
            generatedCodes.push(codeString);

            const codeData: Record<string, any> = {
                code: codeString,
                type: codeType,
                isRedeemed: false,
                createdAt: new Date().toISOString(),
                createdBy: 'admin',
            };
            if (codeType === 'day_pass') codeData.dayNumber = selectedDay;
            if (codeType === 'block') {
                codeData.blockId = selectedBlockId;
                codeData.blockTitle = blockTitle;
            }
            if (recipientEmail && count === 1) codeData.recipientEmail = recipientEmail;
            if (recipientName && count === 1) codeData.recipientName = recipientName;
            if (notes && count === 1) codeData.notes = notes;

            batch.set(codesRef.doc(), codeData);
        }

        await batch.commit();

        return new Response(JSON.stringify({ success: true, codes: generatedCodes }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[generate-ticket-codes] Error:', error);
        logServerError('api/generate-ticket-codes', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Server error.' }), { status: 500 });
    }
}
