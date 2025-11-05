import React, { useState, useEffect } from 'react';
import { Movie, ChatMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { avatars } from './avatars';
import LoadingSpinner from './LoadingSpinner';

interface WatchPartyAdminTabProps {
    allMovies: Record<string, Movie>;
}

const WatchPartyAdminTab: React.FC<WatchPartyAdminTabProps> = ({ allMovies }) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedMovieKey) {
            setMessages([]);
            return;
        }

        setIsLoading(true);
        const db = getDbInstance();
        if (!db) return;

        // Listen for new messages in real-time
        const messagesRef = db.collection('watch_parties').doc(selectedMovieKey).collection('messages').orderBy('timestamp', 'desc');
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(fetchedMessages);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching chat messages:", error);
            setIsLoading(false);
        });

        // Cleanup listener on unmount or when movie selection changes
        return () => unsubscribe();
    }, [selectedMovieKey]);
    
    // Create a sorted list of movies for the dropdown
    // FIX: Cast Object.values to Movie[] to resolve TypeScript errors about unknown properties.
    const moviesWithParties = (Object.values(allMovies) as Movie[]).sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-pink-400">Watch Party Chat Monitoring</h2>
            
            <div className="mb-6">
                <label htmlFor="movie-select" className="block text-sm font-medium text-gray-300 mb-2">
                    Select a Movie to View Chat History
                </label>
                <select 
                    id="movie-select" 
                    value={selectedMovieKey}
                    onChange={e => setSelectedMovieKey(e.target.value)}
                    className="form-input"
                >
                    <option value="">-- Select a Movie --</option>
                    {moviesWithParties.map(movie => (
                        <option key={movie.key} value={movie.key}>{movie.title}</option>
                    ))}
                </select>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">
                        <LoadingSpinner />
                    </div>
                ) : messages.length > 0 ? (
                    <ul className="divide-y divide-gray-700">
                        {messages.map(msg => (
                            <li key={msg.id} className="p-4 flex items-start gap-4 hover:bg-gray-700/50">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 p-1" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-sm text-white">{msg.userName}</p>
                                        <p className="text-xs text-gray-500">
                                            {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'Pending...'}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-1 break-words">{msg.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        {selectedMovieKey ? 'No chat messages for this movie yet.' : 'Select a movie to see the chat.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WatchPartyAdminTab;