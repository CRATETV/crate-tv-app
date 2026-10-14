// api/_lib/streaks.ts — database side of watch streaks (api/streaks.ts).
import type { Firestore } from 'firebase-admin/firestore';
import { resolveMovieAccess } from './entitlements.js';
import { PARTNERS } from './partners.js';
import { selectPwffDays, isOutsidePartner } from './partnerRules.js';
import {
    monthKey, currentMonthlyStreak, bestMonthlyStreak, festivalProgress, earnedBadges, nextNudge, festivalIdentity,
    FestivalInfo, Badge, MONTHLY_MILESTONES,
} from './streakRules.js';

const STREAKS = 'user_streaks';

/** Every festival on the calendar, with its blocks (only blocks that have films). */
export async function loadFestivals(db: Firestore): Promise<FestivalInfo[]> {
    const [daysSnap, settingsSnap, partnersSnap] = await Promise.all([
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
        db.collection(PARTNERS).get().catch(() => null),
    ]);
    const names = new Map(partnersSnap?.docs.map(d => [d.id, String(d.data().published?.details?.title || d.data().name || d.id)]) || []);
    const days = daysSnap.docs.map(d => d.data() as { partnerId?: string; blocks?: any[] });
    const startOf = (blocks: any[]) => {
        const t = blocks.map(b => Date.parse(String(b.screeningStartTime || b.watchPartyStartTime || ''))).filter(Number.isFinite);
        return t.length ? Math.min(...t) : null;
    };
    const usable = (blocks: any[]) => blocks.filter(b => b?.id && Array.isArray(b.movieKeys) && b.movieKeys.length > 0);
    const out: FestivalInfo[] = [];

    const pwffBlocks = usable(selectPwffDays(days).flatMap(d => d.blocks || []));
    if (pwffBlocks.length) {
        const settings = settingsSnap.data() || {};
        const ident = festivalIdentity('pwff', String(settings.pwffFestivalName || 'PWFF').replace(/\s*-\s*Philadelphia$/i, '') || 'PWFF', startOf(pwffBlocks));
        out.push({ ...ident, blocks: pwffBlocks.map(b => ({ id: b.id, title: b.title || 'Block' })) });
    }
    const byPartner = new Map<string, any[]>();
    for (const d of days) if (isOutsidePartner(d.partnerId)) byPartner.set(d.partnerId!, [...(byPartner.get(d.partnerId!) || []), ...(d.blocks || [])]);
    for (const [pid, blocks] of byPartner) {
        const list = usable(blocks);
        if (!list.length) continue;
        const ident = festivalIdentity('partner', names.get(pid) || pid, startOf(list), pid);
        out.push({ ...ident, blocks: list.map(b => ({ id: b.id, title: b.title || 'Block' })) });
    }
    const cf = settingsSnap.data()?.crateFestConfig;
    const cfBlocks = usable(cf?.movieBlocks || []);
    if (cfBlocks.length) {
        const ident = festivalIdentity('cratefest', cf?.title || 'Crate Fest', startOf(cfBlocks));
        out.push({ ...ident, blocks: cfBlocks.map((b: any) => ({ id: b.id, title: b.title || 'Block' })) });
    }
    return out;
}

/** Records a real watch and returns any badges just earned. */
export async function recordWatch(db: Firestore, uid: string, kind: 'party' | 'film', key: string, nowMs = Date.now()): Promise<{ counted: boolean; added: Badge[] }> {
    const festivals = await loadFestivals(db);
    const allBlocks = festivals.flatMap(f => f.blocks.map(b => b.id));

    let blockIds: string[] = [];
    if (kind === 'party') {
        const party = (await db.collection('watch_parties').doc(key).get()).data();
        if (party?.status !== 'live') return { counted: false, added: [] };
        if (!(await resolveMovieAccess(db, { uid, movieKey: key, mode: 'live' })).granted) return { counted: false, added: [] };
        if (allBlocks.includes(key)) blockIds = [key];
    } else {
        if (!(await db.collection('movies').doc(key).get()).exists) return { counted: false, added: [] };
        if (!(await resolveMovieAccess(db, { uid, movieKey: key, mode: 'ondemand' })).granted) return { counted: false, added: [] };
    }
    // A film watched on demand counts for the festival block it belongs to.
    if (!blockIds.length) {
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        const settings = (await db.collection('content').doc('settings').get()).data();
        const blocks = [...daysSnap.docs.flatMap(d => (d.data().blocks || []) as any[]), ...((settings?.crateFestConfig?.movieBlocks || []) as any[])];
        blockIds = blocks.filter(b => b?.id && (b.movieKeys || []).includes(key) && allBlocks.includes(b.id)).map(b => b.id);
    }

    const ref = db.collection(STREAKS).doc(uid);
    return db.runTransaction(async tx => {
        const data = (await tx.get(ref)).data() || {};
        const months = new Set<string>(data.months || []);
        months.add(monthKey(nowMs));
        const watched = new Set<string>(data.blocks || []);
        blockIds.forEach(b => watched.add(b));
        const progress = festivals.map(f => festivalProgress(f, watched));
        const { badges, added } = earnedBadges((data.badges || []) as Badge[], { months: [...months], festivals: progress }, new Date(nowMs).toISOString());
        tx.set(ref, {
            months: [...months].sort().slice(-60),
            blocks: [...watched].slice(-500),
            badges,
            lastWatchAt: new Date(nowMs).toISOString(),
        }, { merge: true });
        return { counted: true, added };
    });
}

export async function streakSummary(db: Firestore, uid: string, nowMs = Date.now()) {
    const [data, festivals] = await Promise.all([
        db.collection(STREAKS).doc(uid).get().then(s => s.data() || {}),
        loadFestivals(db),
    ]);
    const months: string[] = data.months || [];
    const watched = new Set<string>(data.blocks || []);
    const progress = festivals.map(f => festivalProgress(f, watched)).filter(p => p.watched > 0 || p.total > 0);
    const current = currentMonthlyStreak(months, nowMs);
    const nextMilestone = MONTHLY_MILESTONES.find(m => m > current) || null;
    return {
        monthly: { current, best: bestMonthlyStreak(months), watchedThisMonth: months.includes(monthKey(nowMs)), nextMilestone },
        badges: ((data.badges || []) as Badge[]).sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)),
        festivals: progress.filter(p => p.watched > 0),
        nudge: nextNudge(progress),
    };
}

