
import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import SaveStatusToast from './SaveStatusToast';

const RokuAnnouncementManager: React.FC = () => {
    const [message, setMessage] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<any>(null);
    const [showToast, setShowToast] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');

    const MAX_CHARS = 100;

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsubscribe = db.collection('settings').doc('roku').onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const currentMsg = data?.announcement || '';
                setLiveMessage(currentMsg);
                if (currentMsg) {
                    setMessage(currentMsg);
                    setIsEnabled(true);
                } else {
                    // If it's empty in DB, we keep the local message if user is typing, 
                    // but for initial load we set it to empty
                    if (loading) setMessage('');
                }
                setLastUpdated(data?.lastUpdated);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [loading]);

    const handleSave = async () => {
        const db = getDbInstance();
        if (!db) return;

        setSaving(true);
        const finalMessage = isEnabled ? message.trim() : '';

        try {
            await db.collection('settings').doc('roku').set({
                announcement: finalMessage,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: sessionStorage.getItem('operatorName') || 'admin'
            }, { merge: true });
            
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error("Error saving Roku announcement:", error);
            alert("Failed to save announcement. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const suggestions = [
        "🎬 CRATE FEST is LIVE! Get your pass at cratetv.net",
        "🔴 Watch Party tonight at 8pm EST!",
        "✨ New films added this week!"
    ];

    const emojis = ["🎬", "🔴", "📢", "✨", "🔥", "🍿", "🎥", "🎫"];

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Roku Announcement Banner</h3>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Global Broadcast Control • v2.0</p>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Status:</span>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isEnabled && liveMessage ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isEnabled && liveMessage ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{isEnabled && liveMessage ? 'Live' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Card */}
                <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Banner Toggle</label>
                        <button 
                            onClick={() => setIsEnabled(!isEnabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isEnabled ? 'bg-orange-600' : 'bg-gray-800'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Announcement Message</label>
                            <span className={`text-[10px] font-black ${message.length > MAX_CHARS ? 'text-red-500' : 'text-gray-500'}`}>
                                {MAX_CHARS - message.length} chars left
                            </span>
                        </div>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                            placeholder="Enter announcement text..."
                            className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-orange-600/50 transition-colors min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Quick Emojis</p>
                        <div className="flex flex-wrap gap-2">
                            {emojis.map(emoji => (
                                <button 
                                    key={emoji}
                                    onClick={() => setMessage(prev => (prev + emoji).slice(0, MAX_CHARS))}
                                    className="w-10 h-10 bg-black border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all text-lg"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suggestions</p>
                        <div className="space-y-2">
                            {suggestions.map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setMessage(s)}
                                    className="w-full text-left p-3 bg-black/40 border border-white/5 rounded-xl text-[11px] text-gray-400 hover:text-white hover:border-white/20 transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || (isEnabled && !message.trim())}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Save Changes
                            </>
                        )}
                    </button>

                    {lastUpdated && (
                        <p className="text-center text-[9px] font-black uppercase tracking-widest text-gray-600">
                            Last Updated: {lastUpdated?.toDate ? lastUpdated.toDate().toLocaleString() : 'Just now'}
                        </p>
                    )}
                </div>

                {/* Preview Card */}
                <div className="space-y-8">
                    <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 block">Roku App Preview</label>
                        
                        <div className="relative aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-inner group">
                            {/* The Banner */}
                            {isEnabled && message.trim() && (
                                <div className="absolute top-0 left-0 w-full bg-red-600 py-2 px-4 flex items-center justify-center z-10 animate-in slide-in-from-top duration-500">
                                    <p className="text-white text-[10px] font-black uppercase tracking-widest text-center">
                                        {message}
                                    </p>
                                </div>
                            )}

                            {/* Mock Roku UI */}
                            <div className="p-4 pt-12 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-24 h-6 bg-white/5 rounded-md"></div>
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 bg-white/5 rounded-full"></div>
                                        <div className="w-6 h-6 bg-white/5 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="w-full h-32 bg-white/5 rounded-xl"></div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="aspect-video bg-white/5 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>

                            {/* Overlay info */}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Roku Home Screen Mockup</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-orange-600/5 border border-orange-600/10 p-6 rounded-[2rem]">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">System Note</p>
                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                    This banner is pulled by the Roku app every 5 minutes. Changes saved here will propagate to all active Roku devices globally. To clear the banner, toggle it off or clear the text.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showToast && (
                <SaveStatusToast 
                    message="Roku Announcement Synchronized" 
                    isError={false} 
                    onClose={() => setShowToast(false)} 
                />
            )}
        </div>
    );
};

export default RokuAnnouncementManager;
