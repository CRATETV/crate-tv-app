import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { avatars } from './avatars';
import LoadingSpinner from './LoadingSpinner';

interface ChatMonitorModalProps {
    movieKey: string;
    movieTitle: string;
    onClose: () => void;
}

const ChatMonitorModal: React.FC<ChatMonitorModalProps> = ({ movieKey, movieTitle, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
          if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
          window.removeEventListener('keydown', handleEsc);
          document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    useEffect(() => {
        setIsLoading(true);
        const db = getDbInstance();
        if (!db) {
            setIsLoading(false);
            return;
        };

        const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages').orderBy('timestamp', 'desc');
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

        return () => unsubscribe();
    }, [movieKey]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-600" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Chat for "{movieTitle}"</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center p-8"><LoadingSpinner /></div>
                    ) : messages.length > 0 ? (
                        <ul className="divide-y divide-gray-700">
                            {messages.map(msg => (
                                <li key={msg.id} className="p-4 flex items-start gap-4">
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
                        <p className="text-center text-gray-500 py-8">No chat messages for this movie yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatMonitorModal;