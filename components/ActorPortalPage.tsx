import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import PublicS3Uploader from './PublicS3Uploader';
import GreenRoomFeed from './GreenRoomFeed';
import { useAuth } from '../contexts/AuthContext';

const ActorPortalPage: React.FC = () => {
    const { user } = useAuth();

    // Form state - prefill with user data
    const [actorName] = useState(user?.name || '');
    const [email] = useState(user?.email || '');
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [highResPhotoUrl, setHighResPhotoUrl] = useState('');
    const [imdbUrl, setImdbUrl] = useState('');
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [formError, setFormError] = useState('');
    const [activeTab, setActiveTab] = useState('update');

    if (!user) {
        // This should not happen due to route protection, but it's a good safeguard.
        return null; 
    }
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('submitting');
        setFormError('');
        try {
            const response = await fetch('/api/submit-actor-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName, email, bio, photoUrl, highResPhotoUrl, imdbUrl }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit.');
            setFormStatus('success');
            // Reset form fields
            setBio(''); setPhotoUrl(''); setHighResPhotoUrl(''); setImdbUrl('');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setFormStatus('error');
        }
    };

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-2">Welcome to the Actor Portal, {user.name}!</h1>
                    <p className="text-gray-400 mb-8">Update your profile or connect with other actors in the Green Room.</p>
                    
                     <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
                        <TabButton tabName="update" label="Update My Profile" />
                        <TabButton tabName="feed" label="Green Room Feed" />
                    </div>

                    {activeTab === 'update' && (
                        <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg">
                            {formStatus === 'success' ? (
                                <div className="text-center py-10">
                                    <h2 className="text-2xl font-bold text-green-400 mb-4">Submission Received!</h2>
                                    <p className="text-gray-300">Thank you. Our team will review your submission and update your profile shortly.</p>
                                    <button onClick={() => setFormStatus('idle')} className="mt-6 submit-btn">Submit Another Update</button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="actorName" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                            <input type="text" id="actorName" value={actorName} readOnly className="form-input bg-gray-700 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email</label>
                                            <input type="email" id="email" value={email} readOnly className="form-input bg-gray-700 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">New Bio</label>
                                        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} className="form-input" rows={5} required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <PublicS3Uploader label="Upload Headshot (small)" onUploadSuccess={setPhotoUrl} />
                                        <PublicS3Uploader label="Upload High-Res Photo" onUploadSuccess={setHighResPhotoUrl} />
                                    </div>
                                    <div>
                                        <label htmlFor="imdbUrl" className="block text-sm font-medium text-gray-400 mb-2">IMDb Profile Link (Optional)</label>
                                        <input type="url" id="imdbUrl" value={imdbUrl} onChange={e => setImdbUrl(e.target.value)} className="form-input" placeholder="https://www.imdb.com/name/nm..." />
                                    </div>
                                    <button type="submit" className="submit-btn w-full mt-8" disabled={formStatus === 'submitting'}>
                                        {formStatus === 'submitting' ? 'Submitting...' : 'Submit Profile for Review'}
                                    </button>
                                    {formStatus === 'error' && <p className="text-red-400 text-center mt-4">{formError}</p>}
                                </form>
                            )}
                        </div>
                    )}
                    {activeTab === 'feed' && user.name && (
                        <GreenRoomFeed actorName={user.name} />
                    )}
                </div>
            </main>
            <Footer showPortalNotice={true} showActorLinks={true} />
        </div>
    );
};

export default ActorPortalPage;