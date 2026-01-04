import React, { useState, useEffect, useMemo } from 'react';
import { EditorialStory, Movie, FestivalDay } from '../types';
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
    const [festivalDays, setFestivalDays] = useState<FestivalDay[]>([]);
    const [selectedStory, setSelectedStory] = useState<EditorialStory | null>(null);
    const [formData, setFormData] = useState(emptyStory);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        
        const unsubStories = db.collection('editorial_stories').orderBy('publishedAt', 'desc').onSnapshot(snap => {
            const fetched: EditorialStory[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
            setStories(fetched);
            setIsLoading(false);
        });

        const unsubFestival = db.collection('festival').doc('schedule').collection('days').onSnapshot(snap => {
            const fetched: FestivalDay[] = [];
            snap.forEach(doc => fetched.push(doc.data() as FestivalDay));
            setFestivalDays(fetched);
        });

        return () => { unsubStories(); unsubFestival(); };
    }, []);

    const allBlocks = useMemo(() => {
        return festivalDays.flatMap(day => day.blocks);
    }, [festivalDays]);

    const handleSave = async () => {
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
        } catch (e) {
            alert("Save failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (story: EditorialStory) => {
        setSelectedStory(story);
        setFormData({
            title: story.title,
            subtitle: story.subtitle,
            content: story.content,
            heroImage: story.heroImage,
            author: story.author,
            type: story.type,
            linkedMovieKey: story.linkedMovieKey,
            linkedBlockId: story.linkedBlockId
        });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Purge editorial record?")) return;
        const db = getDbInstance();
        if (db) await db.collection('editorial_stories').doc(id).delete();
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Crate Editorial</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Cinematic Narrative CMS // Netflix Tudum Logic</p>
                </div>
                {!selectedStory && (
                    <button onClick={() => setFormData(emptyStory)} className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">Synthesize New Story</button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Editor Pane */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-10">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Narrative Identity</label>
                                {selectedStory && <button onClick={() => { setSelectedStory(null); setFormData(emptyStory); }} className="text-gray-500 hover:text-white text-[10px] font-black uppercase">Cancel Edit</button>}
                            </div>
                            <div className="flex gap-4">
                                <select 
                                    value={formData.type} 
                                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                                    className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-red-600"
                                >
                                    <option value="SPOTLIGHT">Spotlight</option>
                                    <option value="FESTIVAL_HYPE">Festival Hype</option>
                                    <option value="NEWS">News</option>
                                    <option value="INTERVIEW">Interview</option>
                                    <option value="DEEP_DIVE">Deep Dive</option>
                                </select>
                            </div>
                            <input 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="Cinematic Story Title..." 
                                className="w-full bg-transparent text-4xl font-black uppercase tracking-tighter text-white focus:outline-none placeholder:text-gray-800"
                            />
                            <input 
                                value={formData.subtitle} 
                                onChange={e => setFormData({...formData, subtitle: e.target.value})}
                                placeholder="Sub-narrative or blurb..." 
                                className="w-full bg-transparent text-xl font-bold text-gray-500 focus:outline-none placeholder:text-gray-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">02. Hero Asset</label>
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 relative group">
                                    {formData.heroImage ? (
                                        <img src={formData.heroImage} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-[10px] text-gray-800 font-black uppercase">No Image Bound</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <S3Uploader label="Ingest Story Art" onUploadSuccess={(url) => setFormData({...formData, heroImage: url})} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">03. Catalog Binding</label>
                                <div className="space-y-3">
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Link Single Film</p>
                                    <select 
                                        value={formData.linkedMovieKey || ''} 
                                        onChange={e => setFormData({...formData, linkedMovieKey: e.target.value, linkedBlockId: ''})}
                                        className="form-input !bg-white/5 border-white/10"
                                    >
                                        <option value="">No Film Linked</option>
                                        {/* FIX: Cast Object.values to Movie[] to resolve TypeScript type inference errors on unknown properties. */}
                                        {(Object.values(allMovies) as Movie[]).sort((a,b) => (a.title || '').localeCompare(b.title || '')).map(m => (
                                            <option key={m.key} value={m.key}>{m.title}</option>
                                        ))}
                                    </select>
                                    
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest pt-2">Link Festival Block (Hype Mode)</p>
                                    <select 
                                        value={formData.linkedBlockId || ''} 
                                        onChange={e => setFormData({...formData, linkedBlockId: e.target.value, linkedMovieKey: ''})}
                                        className="form-input !bg-white/5 border-white/10"
                                    >
                                        <option value="">No Block Linked</option>
                                        {allBlocks.map(b => (
                                            <option key={b.id} value={b.id}>{b.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-red-600/5 border border-red-500/10 p-4 rounded-xl">
                                    <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">⚠️ Context Binding</p>
                                    <p className="text-[8px] text-gray-500 mt-1">Linking a film or block creates a direct "Watch" CTA at the end of the narrative in the app UI.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">04. Narrative Payload</label>
                            <textarea 
                                value={formData.content} 
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="The story content (Full HTML payload supported)..." 
                                className="form-input bg-black/40 border-white/10 h-64 font-medium"
                                required
                            />
                        </div>

                        <div className="pt-8 border-t border-white/5 flex justify-end gap-4">
                            <button onClick={() => { setSelectedStory(null); setFormData(emptyStory); }} className="px-6 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-12 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 disabled:opacity-20">
                                {isSaving ? 'Synchronizing Cluster...' : (selectedStory ? 'Commit Updates' : 'Push Global Editorial')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Feed */}
                <div className="space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Live Manifest</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto scrollbar-hide">
                            {stories.length === 0 ? (
                                <div className="p-10 text-center opacity-20">
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Active Stories</p>
                                </div>
                            ) : (
                                stories.map(s => (
                                    <div key={s.id} className="p-6 hover:bg-white/[0.01] transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${s.type === 'NEWS' ? 'text-blue-500 border-blue-500/30 bg-blue-500/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}`}>{s.type}</span>
                                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(s)} className="text-gray-500 hover:text-white transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight truncate leading-none">{s.title}</h4>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2">By {s.author}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Added missing default export to satisfy import in AdminPage.tsx
export default EditorialManager;
