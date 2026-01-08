import React, { useState, useEffect } from 'react';
import { EditorialStory, Movie, ZineSection } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface EditorialManagerProps {
    allMovies: Record<string, Movie>;
}

const emptyStory: Omit<EditorialStory, 'id' | 'publishedAt'> = {
    title: '',
    subtitle: '',
    content: '',
    sections: [],
    heroImage: '',
    author: 'Crate Editorial',
    type: 'SPOTLIGHT'
};

const ZineProof: React.FC<{ title: string; subtitle: string; sections: ZineSection[]; heroImage: string }> = ({ title, subtitle, sections, heroImage }) => (
    <div className="bg-white rounded-[3rem] shadow-inner overflow-hidden flex flex-col h-full border-[12px] border-black">
        <div className="p-4 bg-gray-100 border-b flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
            <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Live Dispatch Proof</span>
        </div>
        <div className="flex-grow overflow-y-auto p-10 md:p-16 bg-white scrollbar-hide">
            <div className="max-w-xl mx-auto space-y-12 text-black">
                <div className="border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black italic tracking-tighter leading-[0.8] mb-4">{title || 'THE_HEADLINE'}</h1>
                    <p className="text-xl font-bold text-gray-400 uppercase tracking-tight">{subtitle || 'Sub-narrative manifest placeholder...'}</p>
                </div>

                {heroImage && (
                    <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl">
                        <img src={heroImage} className="w-full h-full object-cover" alt="" />
                    </div>
                )}

                <div className="space-y-10">
                    {(sections || []).map((s, idx) => {
                        if (s.type === 'header') return <h3 key={s.id} className="text-3xl font-black uppercase tracking-tighter italic border-l-4 border-red-600 pl-4">{s.content}</h3>;
                        if (s.type === 'quote') return <div key={s.id} className="bg-gray-50 border-l-8 border-black p-8 text-2xl font-black uppercase italic tracking-tight">"{s.content}"</div>;
                        if (s.type === 'image') return <div key={s.id} className="rounded-2xl overflow-hidden shadow-xl border border-gray-100"><img src={s.content} className="w-full h-auto" alt="" /></div>;
                        return (
                            <div key={s.id} className="relative">
                                {idx === 0 && <span className="float-left text-7xl font-black italic leading-[0.7] mr-3 mt-2 text-red-600">{s.content.charAt(0)}</span>}
                                <p className="text-lg text-gray-700 font-medium leading-relaxed">
                                    {idx === 0 ? s.content.slice(1) : s.content}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
);

const EditorialManager: React.FC<EditorialManagerProps> = ({ allMovies }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [selectedStory, setSelectedStory] = useState<EditorialStory | null>(null);
    const [formData, setFormData] = useState(emptyStory);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStories = async () => {
        setIsLoading(true);
        const db = getDbInstance();
        if (!db) return;
        try {
            const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
            const fetched: EditorialStory[] = [];
            snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
            setStories(fetched);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const addSection = (type: ZineSection['type']) => {
        setFormData({
            ...formData,
            sections: [...(formData.sections || []), { id: `sec_${Date.now()}`, type, content: '' }]
        });
    };

    const updateSection = (id: string, content: string) => {
        setFormData({
            ...formData,
            sections: (formData.sections || []).map(s => s.id === id ? { ...s, content } : s)
        });
    };

    const removeSection = (id: string) => {
        setFormData({
            ...formData,
            sections: (formData.sections || []).filter(s => s.id !== id)
        });
    };

    const handleSave = async () => {
        if (!formData.title) return alert("Headline required.");
        setIsSaving(true);
        const db = getDbInstance();
        if (!db) return;

        try {
            const payload = {
                ...formData,
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (selectedStory) {
                await db.collection('editorial_stories').doc(selectedStory.id).update(payload);
            } else {
                await db.collection('editorial_stories').add({
                    ...payload,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            setSelectedStory(null);
            setFormData(emptyStory);
            fetchStories();
        } catch (e) {
            alert("Sync failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedStory) return;
        if (!window.confirm("PURGE PROTOCOL: Permanently erase this dispatch from the Crate record?")) return;
        
        setIsDeleting(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/delete-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, id: selectedStory.id }),
            });
            if (res.ok) {
                setSelectedStory(null);
                setFormData(emptyStory);
                fetchStories();
            }
        } catch (e) {
            alert("Purge failed.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = () => {
        if (!selectedStory) return;
        const storyData = {
            ...selectedStory,
            exportedAt: new Date().toISOString(),
            platform: 'Crate TV V4'
        };
        const blob = new Blob([JSON.stringify(storyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CRATE_ZINE_${selectedStory.title.replace(/\s+/g, '_')}_ARCHIVE.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Editorial Lab</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase mt-1">NARRATIVE CONTROL UNIT V4.1</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setSelectedStory(null); setFormData(emptyStory); }} className="bg-white/5 text-gray-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">Clear Canvas</button>
                    {selectedStory && (
                        <>
                            <button onClick={handleDownload} className="bg-white/10 text-white border border-white/20 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                Download Archive
                            </button>
                            <button onClick={handleDelete} disabled={isDeleting} className="bg-black text-red-600 border border-red-900/30 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                                {isDeleting ? 'Erasing...' : 'Purge Dispatch'}
                            </button>
                        </>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                        {isSaving ? 'Syncing...' : selectedStory ? 'Update Record' : 'Publish Dispatch'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-320px)] min-h-[700px]">
                {/* Left: Component Selector & Editor */}
                <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto scrollbar-hide pr-2">
                    <section className="bg-black/40 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                        <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">History: Historical Dispatches</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                            {stories.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => { setSelectedStory(s); setFormData(s); }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedStory?.id === s.id ? 'bg-red-600/10 border-red-500/30 text-white' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black uppercase truncate max-w-[180px]">{s.title || 'Untitled'}</p>
                                        <span className="text-[8px] font-mono opacity-40">{(s.type || 'STORY').substring(0,4)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Global Meta</h4>
                         <div className="space-y-4">
                            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Headline" className="form-input bg-black/40 border-white/10 font-black text-xl uppercase tracking-tighter" />
                            <input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Subtitle / Strapline" className="form-input bg-black/40 border-white/10 font-bold" />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-600 uppercase">Dispatch Type</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="form-input bg-black/40 border-white/10 text-xs uppercase font-black">
                                        <option value="SPOTLIGHT">Spotlight</option>
                                        <option value="INTERVIEW">Interview</option>
                                        <option value="NEWS">News</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-600 uppercase">Hero Art URL</label>
                                    <input value={formData.heroImage} onChange={e => setFormData({...formData, heroImage: e.target.value})} placeholder="https://..." className="form-input bg-black/40 border-white/10 text-xs" />
                                </div>
                            </div>
                         </div>
                    </section>

                    <section className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] space-y-8 shadow-xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">02. Section Stack</h4>
                            <div className="flex gap-2">
                                {(['text', 'header', 'quote', 'image'] as const).map(t => (
                                    <button key={t} onClick={() => addSection(t)} className="w-8 h-8 bg-white/5 hover:bg-white text-gray-600 hover:text-black rounded-lg transition-all flex items-center justify-center text-[8px] font-black shadow-lg">
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {(formData.sections || []).map((section, index) => (
                                <div key={section.id} className="bg-black/40 border border-white/5 p-6 rounded-2xl relative group">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{section.type.toUpperCase()} BLOCK {index + 1}</span>
                                        <button onClick={() => removeSection(section.id)} className="text-[9px] font-black text-gray-800 hover:text-red-500 uppercase transition-colors">X</button>
                                    </div>
                                    <textarea 
                                        value={section.content}
                                        onChange={e => updateSection(section.id, e.target.value)}
                                        placeholder="Section content..."
                                        className="form-input bg-white/5 border-white/5 text-sm leading-relaxed"
                                        rows={section.type === 'text' ? 4 : 2}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right: Live Preview */}
                <div className="lg:col-span-8 flex flex-col">
                    <ZineProof title={formData.title} subtitle={formData.subtitle} sections={formData.sections || []} heroImage={formData.heroImage} />
                </div>
            </div>
        </div>
    );
};

export default EditorialManager;