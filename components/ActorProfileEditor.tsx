import React, { useState, useEffect } from 'react';
import { ActorProfile } from '../types';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';

const ACTOR_PASSWORD = 'cratebio';

interface ActorProfileEditorProps {
    actorName: string;
}

const ActorProfileEditor: React.FC<ActorProfileEditorProps> = ({ actorName }) => {
    const [profile, setProfile] = useState<Partial<ActorProfile>>({ bio: '', photo: '', highResPhoto: '', imdbUrl: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await fetch('/api/get-actor-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ actorName, password: ACTOR_PASSWORD })
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch profile.');
                const data = await response.json();
                setProfile(data.profile);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not load your profile data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [actorName]);

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
            const response = await fetch('/api/update-actor-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actorName,
                    password: ACTOR_PASSWORD,
                    bio: profile.bio,
                    photoUrl: profile.photo,
                    highResPhotoUrl: profile.highResPhoto,
                    imdbUrl: profile.imdbUrl,
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to save profile.');
            setSuccess('Your profile has been updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-800/50 border border-gray-700 rounded-lg">
                <LoadingSpinner />
            </div>
        );
    }

    if (error && !profile.bio) { // Show big error if initial load fails
        return <p className="text-red-400 text-center">{error}</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 p-6 md:p-8 rounded-lg space-y-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Update Your Public Profile</h2>
            
            <div className="space-y-6">
                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">Your Bio</label>
                    <textarea
                        id="bio"
                        name="bio"
                        value={profile.bio || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        rows={6}
                        required
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400">Profile Photo (Square)</label>
                        {profile.photo && <img src={profile.photo} alt="Profile preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-600" />}
                         <input
                            type="text"
                            name="photo"
                            value={profile.photo || ''}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Paste image URL or upload"
                            required
                        />
                        <PublicS3Uploader label="Upload New Photo" onUploadSuccess={(url) => handleUrlUpdate('photo', url)} />
                    </div>
                     <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400">High-Res Photo (for Bio Modal)</label>
                        {profile.highResPhoto && <img src={profile.highResPhoto} alt="High-res preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-600" />}
                        <input
                            type="text"
                            name="highResPhoto"
                            value={profile.highResPhoto || ''}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Paste image URL or upload"
                            required
                        />
                        <PublicS3Uploader label="Upload High-Res Photo" onUploadSuccess={(url) => handleUrlUpdate('highResPhoto', url)} />
                    </div>
                </div>

                <div>
                    <label htmlFor="imdbUrl" className="block text-sm font-medium text-gray-400 mb-2">IMDb Profile URL (Optional)</label>
                    <input
                        type="url"
                        id="imdbUrl"
                        name="imdbUrl"
                        value={profile.imdbUrl || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="https://www.imdb.com/name/nm..."
                    />
                </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            {success && <p className="text-green-400 text-sm mt-4">{success}</p>}

            <button type="submit" disabled={isSaving} className="submit-btn bg-purple-600 hover:bg-purple-700 w-full mt-4">
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        </form>
    );
};

export default ActorProfileEditor;