import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import WatchPartyChat from './WatchPartyChat';
import { getDbInstance } from '../services/firebaseClient';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

interface WatchPartyPageProps {
  partyId: string;
}

const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ partyId }) => {
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [partyState, setPartyState] = useState<{ state: 'playing' | 'paused'; currentTime: number; host: string | null; movieKey: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'copied'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false); // To prevent update loops
  const db = getDbInstance();

  // Fetch movie data
  useEffect(() => {
    if (partyState?.movieKey) {
      fetchAndCacheLiveData().then(({ data }) => {
        const movieData = data.movies[partyState.movieKey];
        if (movieData) {
          setMovie(movieData);
        } else {
          setError('Movie for this party could not be found.');
        }
        setIsLoading(false);
      });
    }
  }, [partyState?.movieKey]);

  // Firestore listener for party state
  useEffect(() => {
    if (!db) {
      setError('Database connection is not available for watch party.');
      setIsLoading(false);
      return;
    }
    const partyDocRef = doc(db, 'watch_parties', partyId);
    const unsubscribe = onSnapshot(partyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newState = {
          state: data.state,
          currentTime: data.currentTime,
          host: data.host,
          movieKey: data.movieKey
        };
        setPartyState(newState);

        // Claim host if none exists
        if (!newState.host && user) {
          updateDoc(partyDocRef, { host: user.uid });
          setIsHost(true);
        } else {
          setIsHost(user?.uid === newState.host);
        }
        
        // Sync player state for non-hosts
        if (videoRef.current && user?.uid !== newState.host) {
          isSyncingRef.current = true;
          const video = videoRef.current;
          if (Math.abs(video.currentTime - newState.currentTime) > 2) {
            video.currentTime = newState.currentTime;
          }
          if (newState.state === 'playing' && video.paused) {
            video.play().catch(e => console.warn("Autoplay blocked"));
          } else if (newState.state === 'paused' && !video.paused) {
            video.pause();
          }
          setTimeout(() => { isSyncingRef.current = false; }, 500);
        }
      } else {
        setError('This watch party does not exist or has ended.');
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [partyId, db, user]);
  
  // Host controls: update Firestore on player events
  const updatePartyState = useCallback(async (newState: Partial<typeof partyState>) => {
    if (!db || !isHost || isSyncingRef.current) return;
    const partyDocRef = doc(db, 'watch_parties', partyId);
    await updateDoc(partyDocRef, { ...newState, lastUpdatedAt: serverTimestamp() });
  }, [db, isHost, partyId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    
    const onPlay = () => updatePartyState({ state: 'playing' });
    const onPause = () => updatePartyState({ state: 'paused' });
    const onSeek = () => updatePartyState({ currentTime: video.currentTime });
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeek);
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeek);
    };
  }, [isHost, updatePartyState]);

  const handleInvite = async () => {
    const inviteUrl = window.location.href;
    const shareData = {
      title: `Join My Crate TV Watch Party!`,
      text: `Let's watch "${movie?.title}" together on Crate TV.`,
      url: inviteUrl,
    };

    try {
      // Use Web Share API if available (mobile)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not available.');
      }
    } catch (err) {
      // Fallback to clipboard for desktop
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setInviteStatus('copied');
        setTimeout(() => setInviteStatus('idle'), 2500);
      });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-black text-white">
      <div className="w-full md:flex-grow relative aspect-video md:aspect-auto flex-shrink-0">
        {movie && (
          <video ref={videoRef} src={movie.fullMovie} className="w-full h-full" controls={isHost} onContextMenu={(e) => e.preventDefault()} controlsList="nodownload" playsInline />
        )}
         <div className="absolute top-4 left-4 bg-black/50 p-2 rounded-lg text-xs flex flex-col gap-2">
            <p>You are: <span className="font-bold">{isHost ? 'The Host' : 'A Guest'}</span></p>
             <button onClick={handleInvite} className="flex items-center gap-1 bg-blue-600/80 hover:bg-blue-700/80 text-white font-bold py-1 px-2 rounded-md text-xs">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
               {inviteStatus === 'copied' ? 'Link Copied!' : 'Invite'}
             </button>
        </div>
      </div>
      <div className="w-full md:w-96 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-800 flex-grow md:flex-grow-0 overflow-hidden">
        {user ? <WatchPartyChat partyId={partyId} user={user} /> : <div className="p-4 text-center text-gray-400">Please log in to chat.</div>}
      </div>
    </div>
  );
};

export default WatchPartyPage;