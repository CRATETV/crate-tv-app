// api/admin-zine.ts — writing and managing The Unpack (admin only).
//
// POST { password, action, ... }
//   listStories        → every story, drafts included
//   saveStory          → { story, publish? }  creates or updates; publish=true goes live
//   unpublish          → { id } back to draft
//   deleteStory        → { id }
//   listSubmissions    → pieces festival partners have sent in
//   acceptSubmission   → { id } turns the piece into a DRAFT story to edit
//   returnSubmission   → { id, note } sends it back to the partner with notes

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { assembleAndSyncMasterData } from './publish-data.js';
import { storyChecklist, pieceToDraftStory, sanitizePartnerPiece, isPublishedStory } from './_lib/zineRules.js';
import { notifyPartnerPiece } from './_lib/partnerEmails.js';
import { PARTNERS } from './_lib/partners.js';

export const STORIES = 'editorial_stories';
export const SUBMISSIONS = 'zine_submissions';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const STORY_TYPES = ['NEWS', 'INTERVIEW', 'SPOTLIGHT', 'DEEP_DIVE', 'FILM_FEATURE', 'DIRECTORS_NOTES', 'FESTIVAL_VOICES'];
const SECTION_TYPES = ['text', 'header', 'quote', 'image', 'video', 'callout', 'gallery', 'film'];

const text = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);

/** Only known fields, sensible sizes, no writing hints. */
export function cleanStory(input: any) {
    const sections = (Array.isArray(input?.sections) ? input.sections : []).slice(0, 80).map((s: any, i: number) => ({
        id: text(s?.id, 60) || `sec_${i}`,
        type: SECTION_TYPES.includes(s?.type) ? s.type : 'text',
        content: text(s?.content, 30_000),
        ...(s?.caption ? { caption: text(s.caption, 300) } : {}),
        ...(s?.credit ? { credit: text(s.credit, 100) } : {}),
        ...(s?.label ? { label: text(s.label, 60) } : {}),
    }));
    return {
        title: text(input?.title, 160).trim(),
        subtitle: text(input?.subtitle, 300).trim(),
        content: '',
        sections,
        heroImage: text(input?.heroImage, 600).trim(),
        author: text(input?.author, 120).trim(),
        type: STORY_TYPES.includes(input?.type) ? input.type : 'SPOTLIGHT',
        linkedMovieKey: text(input?.linkedMovieKey, 120).trim(),
        template: text(input?.template, 40),
    };
}

async function partnerEmailsFor(db: FirebaseFirestore.Firestore, partnerId?: string): Promise<string[]> {
    if (!partnerId) return [];
    const doc = await db.collection(PARTNERS).doc(partnerId).get();
    return (doc.data()?.memberEmails as string[] | undefined) || [];
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await verifyAdminPassword(body?.password))) return json({ error: 'Unauthorized' }, 401);
        if (getInitializationError()) return json({ error: 'Database unavailable.' }, 503);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable.' }, 503);

        switch (body.action) {
            case 'listStories': {
                const snap = await db.collection(STORIES).get();
                const stories = snap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, status: data.status === 'draft' ? 'draft' : 'published' };
                });
                return json({ stories });
            }

            case 'saveStory': {
                const story = cleanStory(body.story);
                const id = typeof body.story?.id === 'string' && body.story.id ? body.story.id : db.collection(STORIES).doc().id;
                const ref = db.collection(STORIES).doc(id);
                const existing = await ref.get();
                const wasPublished = existing.exists && isPublishedStory(existing.data() as { status?: string });
                const publish = body.publish === true;

                if (publish) {
                    const check = storyChecklist(story);
                    if (check.errors.length) return json({ error: `Not ready to publish yet: ${check.errors.join(' ')}` }, 400);
                }
                const status = publish || (wasPublished && body.publish !== false) ? 'published' : 'draft';
                const data: Record<string, unknown> = { ...story, status, lastModified: FieldValue.serverTimestamp() };
                const goingLive = status === 'published' && (!existing.exists || existing.data()?.status === 'draft');
                // A story's date is the day it goes live (not the day the draft was started).
                if (!existing.exists || goingLive) data.publishedAt = FieldValue.serverTimestamp();
                // Keep the partner link when a partner piece is being edited.
                if (existing.exists) {
                    const prev = existing.data() || {};
                    if (prev.partnerId) { data.partnerId = prev.partnerId; data.partnerName = prev.partnerName || ''; }
                }
                await ref.set(data, { merge: true });
                await assembleAndSyncMasterData(db).catch(e => console.error('[admin-zine] republish failed', e));

                if (goingLive && existing.data()?.partnerId) {
                    notifyPartnerPiece(await partnerEmailsFor(db, existing.data()!.partnerId), existing.data()!.partnerName || '', story.title, 'live', '', id)
                        .catch(e => console.error('[admin-zine] partner email failed', e));
                }
                return json({ success: true, id, status });
            }

            case 'unpublish': {
                const id = text(body.id, 120);
                if (!id) return json({ error: 'Missing id.' }, 400);
                await db.collection(STORIES).doc(id).set({ status: 'draft', lastModified: FieldValue.serverTimestamp() }, { merge: true });
                await assembleAndSyncMasterData(db).catch(e => console.error('[admin-zine] republish failed', e));
                return json({ success: true });
            }

            case 'deleteStory': {
                const id = text(body.id, 120);
                if (!id) return json({ error: 'Missing id.' }, 400);
                await db.collection(STORIES).doc(id).delete();
                await assembleAndSyncMasterData(db).catch(e => console.error('[admin-zine] republish failed', e));
                return json({ success: true });
            }

            case 'listSubmissions': {
                const snap = await db.collection(SUBMISSIONS).get();
                const submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter((s: any) => s.status === 'submitted')
                    .sort((a: any, b: any) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
                return json({ submissions });
            }

            case 'acceptSubmission': {
                const id = text(body.id, 120);
                const ref = db.collection(SUBMISSIONS).doc(id);
                const doc = await ref.get();
                const sub = doc.data();
                if (!doc.exists || !sub || sub.status !== 'submitted') return json({ error: 'That piece is no longer waiting for review.' }, 404);
                const { piece, errors } = sanitizePartnerPiece(sub.piece);
                if (errors.length) return json({ error: `The piece has problems: ${errors.join(' ')}` }, 400);
                const draft = pieceToDraftStory(piece, { id: sub.partnerId, name: sub.partnerName });
                const storyRef = db.collection(STORIES).doc();
                await storyRef.set({ ...draft, publishedAt: FieldValue.serverTimestamp(), lastModified: FieldValue.serverTimestamp() });
                await ref.set({ status: 'accepted', storyId: storyRef.id, reviewedAt: new Date().toISOString() }, { merge: true });
                notifyPartnerPiece(await partnerEmailsFor(db, sub.partnerId), sub.partnerName, piece.title, 'accepted', '')
                    .catch(e => console.error('[admin-zine] partner email failed', e));
                return json({ success: true, storyId: storyRef.id });
            }

            case 'returnSubmission': {
                const id = text(body.id, 120);
                const note = text(body.note, 2000).trim();
                if (!note) return json({ error: 'Write a short note so the partner knows what to change.' }, 400);
                const ref = db.collection(SUBMISSIONS).doc(id);
                const doc = await ref.get();
                const sub = doc.data();
                if (!doc.exists || !sub || sub.status !== 'submitted') return json({ error: 'That piece is no longer waiting for review.' }, 404);
                await ref.set({ status: 'changes', note, reviewedAt: new Date().toISOString() }, { merge: true });
                notifyPartnerPiece(await partnerEmailsFor(db, sub.partnerId), sub.partnerName, sub.piece?.title || 'your piece', 'changes', note)
                    .catch(e => console.error('[admin-zine] partner email failed', e));
                return json({ success: true });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        console.error('[admin-zine] failed:', e);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
