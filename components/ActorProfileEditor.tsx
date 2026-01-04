
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ActorProfile } from '../types';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface ActorProfileEditorProps {
    actorName: string;
}

const ActorProfileEditor: React.FC<ActorProfileEditorProps> = ({ actorName }) => {
    const { getUserIdToken } = useAuth();
    const [profile, setProfile] = useState<Partial<ActorProfile>>({ bio: '', photo: '', highResPhoto: '', imdbUrl: '', isAvailableForCasting: false });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const profileStrength = useMemo(() => {
        let score = 0;
        if (profile.bio && profile.bio.length > 100) score += 40;
        if (profile.photo && !profile.photo.includes('Defaultpic')) score += 20;
        if (profile.highResPhoto && !profile.highResPhoto.includes('Defaultpic')) score += 20;
        if (profile.imdbUrl) score += 20;
        return score;
    }, [profile]);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = await getUserIdToken();
            if (!token) throw new Error("Authentication session required.");
            const response = await fetch('/api/get-actor-profile', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            const data = await response.json();
            if (data.profile) setProfile(data.profile);
        } catch (err) {
            setError('Could not load profile data.');
        } finally {
            setIsLoading(false);
        }
    }, [getUserIdToken]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handlePolishBio = async () => {
        if (!profile.bio || profile.bio.length < 20) {
            alert("Please write a draft first so the AI has context to work with.");
            return;
        }
        setIsPolishing(true);
        try {
            const token = await getUserIdToken();
            const res = await fetch('/api/polish-actor-bio', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bio: profile.bio })
            });
            const data = await res.json();
            if (data.polishedBio) {
                setProfile(prev => ({ ...prev, bio: data.polishedBio }));
                setSuccess("Bio refined for industry standards.");
            }
        } catch (e) {
            setError("Refiner temporarily offline.");
        } finally {
            setIsPolishing(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setProfile(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = await getUserIdToken();
            await fetch('/api/update-actor-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...profile, photoUrl: profile.photo, highResPhotoUrl: profile.highResPhoto }),
            });
            setSuccess('Profile manifest synchronized.');
        } catch (err) {
            setError('Update failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10">
            {/* Profile Strength Meter */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Discovery Readiness</h3>
                        <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Visibility strength in the Industry Terminal</p>
                    </div>
                    <div className="flex-grow max-w-md w-full">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{profileStrength}% Strength</span>
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{profileStrength < 100 ? 'Incomplete manifest' : 'System Verified'}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-red-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(239,68,68,0.5)]" style={{ width: `${profileStrength}%` }}></div>
                        </div>
                    </div>
                </div>
                {profileStrength < 100 && (
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-6 text-center italic">
                        Tip: Reach 100% to unlock "Global Selection" prioritization in search results.
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] space-y-12 shadow-2xl">
                <section className="space-y-6">
                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Narrative Biography</label>
                        <button 
                            type="button" 
                            onClick={handlePolishBio} 
                            disabled={isPolishing}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-1.5 rounded-lg text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-30 transition-all"
                        >
                            {isPolishing ? 'Refining...' : '✨ Refine with Gemini'}
                        </button>
                    </div>
                    <textarea
                        name="bio"
                        value={profile.bio}
                        onChange={handleInputChange}
                        className="form-input bg-black/40 min-h-[200px] leading-relaxed text-gray-300 font-medium"
                        placeholder="Detail your professional experience..."
                        required
                    />
                </section>
                
                <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">02. Talent Imaging</label>
                        <div className="aspect-square w-32 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group relative">
                            {profile.photo ? <img src={profile.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-800 text-[10px]">No Image</div>}
                        </div>
                        <PublicS3Uploader label="Primary Headshot" onUploadSuccess={(url) => setProfile(p => ({...p, photo: url}))} />
                    </div>
                    <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. High-Res Identity</label>
                         <div className="aspect-video w-full max-w-[200px] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group relative">
                            {profile.highResPhoto ? <img src={profile.highResPhoto} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-800 text-[10px]">No Image</div>}
                        </div>
                        <PublicS3Uploader label="Gallery Master" onUploadSuccess={(url) => setProfile(p => ({...p, highResPhoto: url}))} />
                    </div>
                </section>

                <div className="pt-8 border-t border-white/5 space-y-6">
                    {success && <p className="text-green-500 text-[10px] font-black uppercase tracking-widest text-center">{success}</p>}
                    <button type="submit" disabled={isSaving} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all">
                        {isSaving ? 'Syncing...' : 'Push Profile Updates'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ActorProfileEditor;
