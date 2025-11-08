import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Movie } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { avatars } from './avatars';

interface ChatMonitorModalProps {
  movie: Movie;
  onClose: () => void;
}

const ChatMonitorModal: React.FC<ChatMonitorModalProps> = ({ movie, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        const db = getDbInstance();
        if (!db) return;
        
        const messagesRef = db.collection('watch_parties').doc(movie.key).collection('messages').orderBy('timestamp', 'asc');
        const unsubscribe = messagesRef.onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(fetchedMessages);
        });

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
            unsubscribe();
        };
    }, [movie.key, onClose]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col border border-gray-600" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Live Chat Monitor</h2>
                        <p className="text-sm text-gray-400">{movie.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 p-1" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                            <div>
                                <p className="font-bold text-sm text-white">{msg.userName}</p>
                                <p className="text-sm text-gray-300 break-words">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    );
};

export default ChatMonitorModal;
