import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { promoCodesData } from '../constants.js';
import { PromoCode } from '../types.js';

// PromoCodeManager.tsx used to create/delete/restore voucher codes by
// writing straight to Firestore from the browser. firestore.rules blocks
// ALL client writes to promo_codes (`allow write: if false` — the same
// server-authoritative pattern already used for rentals/unlockedBlocks/etc,
// so nobody can grant themselves a working code from devtools). That meant
// every "Generate Code," "Revoke," and "Restore Defaults" action in the
// admin voucher panel was silently failing on a Firestore permissions
// error the UI never surfaced — the whole voucher section looked broken
// because it was: nothing it did ever actually reached the database.
// Routed server-side, using the Admin SDK, same pattern as
// unlockFestivalBlock and every other access grant in this codebase.
const checkAuth = (request: Request) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    return (primaryAdminPassword && token === primaryAdminPassword) || (masterPassword && token === masterPassword);
};

export async function POST(request: Request) {
    if (!checkAuth(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    try {
        const body = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        // ── RESTORE DEFAULTS — resync the hardcoded starter vouchers ──────
        if (body.action === 'restoreDefaults') {
            const batch = db.batch();
            Object.entries(promoCodesData).forEach(([id, data]) => {
                const ref = db.collection('promo_codes').doc(id);
                batch.set(ref, {
                    ...data,
                    code: id,
                    usedCount: 0,
                    createdBy: 'system_restore',
                    createdAt: FieldValue.serverTimestamp(),
                }, { merge: true });
            });
            await batch.commit();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        // ── CREATE A NEW VOUCHER CODE ──────────────────────────────────────
        const { code, internalName, type, discountValue, maxUses, itemId, createdBy } = body;
        const cleanCode = String(code || '').toUpperCase().trim().replace(/\s/g, '');
        if (!cleanCode) {
            return new Response(JSON.stringify({ error: 'Code is required.' }), { status: 400 });
        }

        const codeRef = db.collection('promo_codes').doc(cleanCode);
        const existing = await codeRef.get();
        if (existing.exists) {
            return new Response(JSON.stringify({ error: 'Access Denied: You cannot overwrite this code as it was created by another node.' }), { status: 409 });
        }

        const resolvedType: PromoCode['type'] = type === 'discount' ? 'discount' : 'one_time_access';
        const codeData: Omit<PromoCode, 'id'> = {
            code: cleanCode,
            internalName: internalName?.trim() || undefined,
            type: resolvedType,
            discountValue: resolvedType === 'discount' ? (Number(discountValue) || 0) : 100,
            maxUses: Number(maxUses) > 0 ? Number(maxUses) : 1,
            usedCount: 0,
            itemId: itemId || undefined,
            createdBy: createdBy || 'admin',
            createdAt: FieldValue.serverTimestamp(),
        } as any;

        await codeRef.set(codeData);
        return new Response(JSON.stringify({ success: true, code: cleanCode }), { status: 201 });
    } catch (error) {
        console.error('[manage-promo-codes] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Voucher operation failed.' }), { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!checkAuth(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return new Response(JSON.stringify({ error: 'Code id is required.' }), { status: 400 });

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        await db.collection('promo_codes').doc(id).delete();
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('[manage-promo-codes] Delete error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Failed to revoke code.' }), { status: 500 });
    }
}
