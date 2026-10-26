import { useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { getDbInstance } from '../services/firebaseClient';

interface UseWatchHeartbeatParams {
  blockId: string;
  userId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  heartbeatIntervalMs?: number; // default 20s
}

// Records who is ACTUALLY watching a watch party (video playing, tab
// visible), for the "watching now" counts and the post-party report.
//
// FIX (Oct 2026): this only looked for the video player once, when the page
// first opened. Anyone who arrived early sat in the lobby (no player yet),
// so when the film started their viewing was never recorded and the
// "watching" count stayed near zero. It now checks the player on every tick,
// and only starts counting someone once their video is really playing.
export function useWatchHeartbeat({
  blockId,
  userId,
  videoRef,
  heartbeatIntervalMs = 20000,
}: UseWatchHeartbeatParams) {
  const watchSecondsRef = useRef(0);

  useEffect(() => {
    const db = getDbInstance();
    if (!blockId || !userId || !db) return;

    const sessionDocRef = db.collection('watchSessions').doc(`${userId}_${blockId}_${Date.now()}`);
    let started = false;
    let busy = false;
    watchSecondsRef.current = 0;

    const isWatching = () => {
      const el = videoRef.current;
      return !!el && !el.paused && !el.ended && !document.hidden;
    };

    const tick = async () => {
      if (busy || !isWatching()) return;
      busy = true;
      try {
        if (!started) {
          started = true;
          await sessionDocRef.set({
            userId,
            blockId,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
            watchSeconds: 0,
            device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          });
          return;
        }
        watchSecondsRef.current += heartbeatIntervalMs / 1000;
        await sessionDocRef.set(
          { lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(), watchSeconds: watchSecondsRef.current },
          { merge: true },
        );
      } catch {
        // Counting must never interrupt the film.
      } finally {
        busy = false;
      }
    };

    // Check quickly at first (so a viewer is counted within seconds of the
    // film starting), then every heartbeat.
    const fastCheck = setInterval(() => { if (!started) tick(); }, 3000);
    const interval = setInterval(tick, heartbeatIntervalMs);

    return () => {
      clearInterval(fastCheck);
      clearInterval(interval);
      if (started) {
        sessionDocRef.set(
          {
            lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
            watchSeconds: watchSecondsRef.current,
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        ).catch(() => {});
      }
    };
  }, [blockId, userId, videoRef, heartbeatIntervalMs]);
}
