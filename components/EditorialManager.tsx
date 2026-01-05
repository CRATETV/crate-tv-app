
import React, { useState, useEffect } from 'react';
import { EditorialStory, Movie } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import S3Uploader from './S3Uploader';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface EditorialManagerProps {
    allMovies: Record<string, Movie>;
}

const emptyStory: Omit<EditorialStory, 'id' | 'publishedAt'> = {
    title: '',
    subtitle: '',
    content: '',
    heroImage: '',
    author: 'Crate Editorial',
    type: 'SPOTLIGHT'
};

const EditorialManager: React.FC<EditorialManagerProps> = ({ allMovies }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [selectedStory, setSelectedStory] = useState<EditorialStory | null>(null);
    const [formData, setFormData] = useState(emptyStory);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        
        const unsub = db.collection('editorial_stories').orderBy('publishedAt', 'desc').onSnapshot(snap => {
            const fetched: EditorialStory[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
            setStories(fetched);
            setIsLoading(false);
        });

        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!formData.title || !formData.content) return alert("Title and Content are required.");
        setIsSaving(true);
        const db = getDbInstance();
        if (!db) return;

        try {
            if (selectedStory) {
                await db.collection('editorial_stories').doc(selectedStory.id).update({
                    ...formData,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await db.collection('editorial_stories').add({
                    ...formData,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            setSelectedStory(null);
            setFormData(emptyStory);
            alert("Dispatch synchronized to global feed.");
        } catch (e) {
            alert("Save failed.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="flex justify-between items-center border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Crate Zine Synth</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase mt-1">Single-View Magazine & Newsletter Builder</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setSelectedStory(null); setFormData(emptyStory); }} className="bg-white/5 text-gray-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">New Dispatch</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-10 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all">
                        {isSaving ? 'Syncing...' : 'Dispatch Story'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Composition Hub */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-10">
                        <div className="space-y-6">
                            <input 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="THE MASTER HEADLINE..." 
                                className="w-full bg-transparent text-5xl font-black uppercase tracking-tighter text-white focus:outline-none placeholder:text-gray-800"
                            />
                            <input 
                                value={formData.subtitle} 
                                onChange={e => setFormData({...formData, subtitle: e.target.value})}
                                placeholder="Sub-narrative or issue hook..." 
                                className="w-full bg-transparent text-xl font-bold text-gray-600 focus:outline-none placeholder:text-gray-800 border-b border-white/5 pb-4"
                            />
                        </div>

                        <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 relative group shadow-inner">
                            {formData.heroImage ? (
                                <img src={formData.heroImage} className="w-full h-full object-cover opacity-60" alt="" />
                            ) : (
                                <div className="h-full flex items-center justify-center text-[10px] text-gray-800 font-black uppercase tracking-[0.4em]">Visual Payload Required</div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8">
                                <S3Uploader label="Ingest Master Visual" onUploadSuccess={(url) => setFormData({...formData, heroImage: url})} />
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="flex justify-between items-center px-2">
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Editorial Payload (HTML Compatible)</p>
                            </div>
                            <textarea 
                                value={formData.content} 
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Synthesize the story narrative here..." 
                                className="form-input bg-black/40 border-white/10 h-[500px] font-medium leading-relaxed !p-10 text-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Parameters & History */}
                <div className="space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] space-y-8 shadow-2xl">
                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em]">Story Parameters</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block">Story Sector</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="form-input !bg-black/40 border-white/10">
                                    <option value="SPOTLIGHT">Spotlight</option>
                                    <option value="INTERVIEW">Interview</option>
                                    <option value="DEEP_DIVE">Deep Dive</option>
                                    <option value="NEWS">Global Dispatch</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block">Link Master Work</label>
                                <select value={formData.linkedMovieKey || ''} onChange={e => setFormData({...formData, linkedMovieKey: e.target.value})} className="form-input !bg-black/40 border-white/10">
                                    <option value="">None</option>
                                    {(Object.values(allMovies) as Movie[]).sort((a,b)=>a.title.localeCompare(b.title)).map(m => (
                                        <option key={m.key} value={m.key}>{m.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-8 rounded-[3rem] shadow-2xl">
                        <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-6">Archive Transmissions</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                            {stories.map(s => (
                                <button key={s.id} onClick={() => { setSelectedStory(s); setFormData(s); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedStory?.id === s.id ? 'bg-red-600/10 border-red-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                                    <p className="text-[7px] font-black text-gray-500 uppercase mb-1">{s.type}</p>
                                    <h4 className="text-xs font-black text-white uppercase truncate">{s.title}</h4>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorialManager;
