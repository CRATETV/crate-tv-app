/**
 * useSessionGuard
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects paid content from password sharing.
 *
 * How it works:
 *   1. Every login writes a unique session token to both localStorage and
 *      Firestore (users/{uid}.activeSessionToken), plus an expiry 24h later.
 *   2. This hook polls every 30s to check:
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
}

export function useSessionGuard(
    uid: string | null | undefined,
    active: boolean   // only validate when this is true (e.g. only during paid content)
): SessionGuardResult {
    const [kicked, setKicked] = useState(false);
    const [reason, setReason] = useState<KickReason>(null);
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
                if (!localToken) return; // no token = old session pre-feature, skip

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

        validate();
        const interval = setInterval(validate, 30000);
        return () => clearInterval(interval);
    }, [uid, active, kicked]);

    return { kicked, reason };
}
