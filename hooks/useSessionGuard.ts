/**
 * useSessionGuard
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects paid content from password sharing.
 *
 * How it works:
 *   1. Every login writes a unique session token to both localStorage and
 *      Firestore (users/{uid}.activeSessionToken), plus an expiry 24h later.
 *   2. This hook waits 5s on mount (to avoid catching this device's own
 *      in-flight session claim mid-write), then polls every 30s to check:
 *      a) Local token matches Firestore token  →  still valid
 *      b) Local token expired (>24h)           →  force re-login
 *      c) Firestore token differs              →  someone else logged in → kick
 *   3. Returns { kicked, reason } — parent renders a kicked screen when true.
 *
 * Used in: WatchPartyPage (live + VOD), MoviePage (festival films)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { getDbInstance } from '../services/firebaseClient';

type KickReason = 'other_device' | 'session_expired' | null;

interface SessionGuardResult {
    kicked: boolean;
    reason: KickReason;
    otherSessionAt: string | null; // when the currently-active session was claimed, if known — lets the kicked screen say "this happened at X" instead of leaving it unexplained
}

export function useSessionGuard(
    uid: string | null | undefined,
    active: boolean   // only validate when this is true (e.g. only during paid content)
): SessionGuardResult {
    const [kicked, setKicked] = useState(false);
    const [reason, setReason] = useState<KickReason>(null);
    const [otherSessionAt, setOtherSessionAt] = useState<string | null>(null);
    const failureCountRef = useRef(0); // don't kick on transient network failures

    useEffect(() => {
        if (!uid || !active || kicked) return;

        const validate = async () => {
            try {
                // 1. Check local token expiry first (no network needed)
                const expiresAt = localStorage.getItem('crate_session_expires');
                if (expiresAt && new Date(expiresAt) < new Date()) {
                    setReason('session_expired');
                    setKicked(true);
                    return;
                }

                const localToken = localStorage.getItem('crate_session_token');
                if (!localToken) {
                    // FIX (user report — logged into the same account on two
                    // devices, neither ever got signed out): this used to
                    // just `return` here forever, treating a missing local
                    // token as "pre-feature session, not worth checking."
                    // But localStorage can also go missing on a device that
                    // otherwise stayed logged in the whole time — Safari
                    // clears it automatically after about a week of no
                    // interaction even though Firebase's own login
                    // persistence (IndexedDB) is untouched and keeps the
                    // session alive. That device would then never write a
                    // token, never get checked, and never get kicked no
                    // matter how many other devices logged in afterward —
                    // effectively invisible to this whole feature,
                    // permanently. Claiming a fresh token here instead means
                    // this device starts participating in the same
                    // single-active-session enforcement as every other one,
                    // rather than opting out of it silently and forever.
                    const db = getDbInstance();
                    if (!db) return;
                    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    localStorage.setItem('crate_session_token', token);
                    localStorage.setItem('crate_session_expires', expiresAt);
                    await db.collection('users').doc(uid).update({
                        activeSessionToken: token,
                        sessionExpiresAt: expiresAt,
                    }).catch(() => {});
                    return; // this device is now the authoritative session; next poll validates normally
                }

                // 2. Check against Firestore
                const db = getDbInstance();
                if (!db) return;
                const doc = await db.collection('users').doc(uid).get();
                const data = doc.data();
                if (!data) return;

                const serverToken = data.activeSessionToken;
                const serverExpiry = data.sessionExpiresAt;

                // Server says session expired
                if (serverExpiry && new Date(serverExpiry) < new Date()) {
                    setReason('session_expired');
                    setKicked(true);
                    return;
                }

                // Token mismatch = another device logged in
                if (serverToken && serverToken !== localToken) {
                    setReason('other_device');
                    setOtherSessionAt(data.lastLoginAt || null);
                    setKicked(true);
                    return;
                }

                // All good — reset failure count
                failureCountRef.current = 0;
            } catch {
                // Network error — don't immediately kick.
                // Allow up to 3 consecutive failures before acting.
                failureCountRef.current += 1;
                if (failureCountRef.current >= 3) {
                    // After 3 failures (90s), stop checking but don't kick
                    // — we don't want to punish users for bad connectivity.
                    // Session will be re-validated on next page load.
                }
            }
        };

        // Don't check immediately on mount — see comment above the effect's
        // closing bracket for why. A short initial delay avoids catching
        // this device's own in-flight session claim mid-write.
        const INITIAL_CHECK_DELAY_MS = 5000;
        const initialTimer = setTimeout(validate, INITIAL_CHECK_DELAY_MS);
        const interval = setInterval(validate, 30000);
        return () => { clearTimeout(initialTimer); clearInterval(interval); };
    }, [uid, active, kicked]);

    return { kicked, reason, otherSessionAt };
}
