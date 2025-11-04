
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { avatars } from './avatars';

interface Message {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  text: string;
  timestamp: any;
}

interface WatchPartyChatProps {
  partyId: string;
  user: User;
}

const WatchPartyChat: React.FC<WatchPartyChatProps> = ({ partyId, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const db = getDbInstance();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;
    const messagesColRef = collection(db, 'watch_parties', partyId, 'messages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [db, partyId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newMessage.trim()) return;

    await addDoc(collection(db, 'watch_parties', partyId, 'messages'), {
      uid: user.uid,
      name: user.name,
      avatar: user.avatar,
      text: newMessage,
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-bold text-white">Party Chat</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 p-1 flex-shrink-0" dangerouslySetInnerHTML={{ __html: avatars[msg.avatar] || avatars['fox'] }} />
            <div>
              <p className="font-bold text-sm text-white">{msg.name}</p>
              <p className="text-gray-300 break-words">{msg.text}</p>
            </div>
          </div>
        ))}
         <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Say something..."
          className="form-input"
        />
      </form>
    </div>
  );
};

export default WatchPartyChat;
