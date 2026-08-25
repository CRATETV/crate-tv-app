import { useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { getDbInstance } from '../services/firebaseClient';

interface UseWatchHeartbeatParams {
  blockId: string;
  userId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  heartbeatIntervalMs?: number; // default 20s
}

export function useWatchHeartbeat({
  blockId,
  userId,
  videoRef,
  heartbeatIntervalMs = 20000,
}: UseWatchHeartbeatParams) {
  const sessionIdRef = useRef<string>(`${userId}_${blockId}_${Date.now()}`);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchSecondsRef = useRef(0);

  useEffect(() => {
    const videoEl = videoRef.current;
    const db = getDbInstance();
    if (!videoEl || !blockId || !userId || !db) return;

    const sessionDocRef = db.collection('watchSessions').doc(sessionIdRef.current);

    const initSession = async () => {
      await sessionDocRef.set({
        userId,
        blockId,
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
        watchSeconds: 0,
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      });
    };
    initSession();

    const sendHeartbeat = async () => {
      // Only count time if the video is actually playing and tab is visible
      if (videoEl.paused || document.hidden) return;

      watchSecondsRef.current += heartbeatIntervalMs / 1000;

      await sessionDocRef.set(
        {
          lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
          watchSeconds: watchSecondsRef.current,
        },
        { merge: true }
      );
    };

    intervalRef.current = setInterval(sendHeartbeat, heartbeatIntervalMs);

    // Clean stop on unmount (user navigates away, closes tab, etc.)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Fire a final heartbeat so the last watched moment is captured
      sessionDocRef.set(
        {
          lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
          watchSeconds: watchSecondsRef.current,
          endedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    };
  }, [blockId, userId, videoRef, heartbeatIntervalMs]);
}
