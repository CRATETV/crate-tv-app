import React, { useState, useEffect, useCallback } from 'react';
import { ActorProfile } from '../types';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface ActorProfileEditorProps {
    actorName: string;
}

const ActorProfileEditor: React.FC<ActorProfileEditorProps> = ({ actorName }) => {
    const { getUserIdToken } = useAuth();
    const [profile, setProfile] = useState<Partial<ActorProfile>>({ bio: '', photo: '', highResPhoto: '', imdbUrl: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = await getUserIdToken();
            if (!token) {
                throw new Error("Authentication session required.");
            }
            const response = await fetch('/api/get-actor-profile', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            const data = await response.json();
            
            if (!response.ok) {
                // If it's just a temporary AI error, don't break the whole editor
                if (data.isQuotaError) {
                    setError("AI services are at peak capacity. You can still edit your bio and photos manually.");
                } else {
                    throw new Error(data.error || 'Failed to fetch profile.');
                }
            }
            
            if (data.profile) {
                setProfile(data.profile);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load profile data.');
        } finally {
            setIsLoading(false);
        }
    }, [getUserIdToken]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleUrlUpdate = (field: keyof ActorProfile, url: string) => {
        setProfile(prev => ({ ...prev, [field]: url }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = await getUserIdToken();
            if (!token) throw new Error("Auth session expired.");
            
            const response = await fetch('/api/update-actor-profile', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bio: profile.bio,
                    photoUrl: profile.photo,
                    highResPhotoUrl: profile.highResPhoto,
                    imdbUrl: profile.imdbUrl,
                }),
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || 'Failed to save changes.');
            
            setSuccess('Manifest updated. Profile changes are now live across Crate TV.');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'A system error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-[#0f0f0f] border border-white/5 rounded-[2rem] space-y-4">
                <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Synchronizing Profile...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] space-y-12 animate-[fadeIn_0.4s_ease-out]">
            <div className="border-b border-white/5 pb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Profile Manifest</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Manage your professional digital footprint.</p>
            </div>
            
            <div className="space-y-10">
                <section className="space-y-4">
                    <label htmlFor="bio" className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Professional Biography</label>
                    <textarea
                        id="bio"
                        name="bio"
                        value={profile.bio || ''}
                        onChange={handleInputChange}
                        className="form-input bg-black/40 min-h-[160px] leading-relaxed text-gray-300"
                        placeholder="Detail your professional experience and technique..."
                        required
                    />
                </section>
                
                <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">02. Primary Headshot</label>
                        <div className="aspect-square w-32 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4 group relative">
                            {profile.photo ? (
                                <img src={profile.photo} alt="Current" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-800 font-black text-[10px] uppercase">No File</div>
                            )}
                        </div>
                        <PublicS3Uploader label="Replace Image" onUploadSuccess={(url) => handleUrlUpdate('photo', url)} />
                    </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">03. High-Resolution Source</label>
                        <div className="aspect-video w-full max-w-[200px] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4 group relative">
                            {profile.highResPhoto ? (
                                <img src={profile.highResPhoto} alt="Current High Res" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-800 font-black text-[10px] uppercase">No File</div>
                            )}
                        </div>
                        <PublicS3Uploader label="Replace High-Res" onUploadSuccess={(url) => handleUrlUpdate('highResPhoto', url)} />
                    </div>
                </section>

                <section className="space-y-4">
                    <label htmlFor="imdbUrl" className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">04. External Accreditation</label>
                    <input
                        type="url"
                        id="imdbUrl"
                        name="imdbUrl"
                        value={profile.imdbUrl || ''}
                        onChange={handleInputChange}
                        className="form-input bg-black/40"
                        placeholder="https://www.imdb.com/name/nm..."
                    />
                </section>
            </div>

            <div className="pt-8 border-t border-white/5">
                {error && (
                    <div className="mb-6 p-4 bg-red-900/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                         <span className="text-red-500 text-lg">⚠️</span>
                         <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-900/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                         <span className="text-green-500 text-lg">✓</span>
                         <p className="text-green-500 text-xs font-bold uppercase tracking-widest">{success}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-[0.98]"
                >
                    {isSaving ? 'Synchronizing Cluster...' : 'Commit Changes'}
                </button>
            </div>
        </form>
    );
};

export default ActorProfileEditor;