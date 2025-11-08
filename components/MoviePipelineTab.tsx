import React, { useState } from 'react';
import { MoviePipelineEntry } from '../types';
import { deleteMoviePipelineEntry } from '../services/firebaseService';

interface MoviePipelineTabProps {
    pipeline: MoviePipelineEntry[];
    onCreateMovie: (item: MoviePipelineEntry) => void;
    onRefresh: () => void;
}

const emptyEntry = {
    title: '',
    director: '',
    cast: '',
    synopsis: '',
    posterUrl: '',
    movieUrl: '',
    submitterEmail: ''
};

const MoviePipelineTab: React.FC<MoviePipelineTabProps> = ({ pipeline, onCreateMovie, onRefresh }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newEntry, setNewEntry] = useState(emptyEntry);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this submission? This cannot be undone.")) return;
        setProcessingId(id);
        try {
            await deleteMoviePipelineEntry(id);
            onRefresh(); // Refresh parent data
        } catch (error) {
            alert(`Failed to delete submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreate = (item: MoviePipelineEntry) => {
        setProcessingId(item.id);
        onCreateMovie(item);
        // Parent component will handle deleting the item from the pipeline after creation.
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filmTitle: newEntry.title,
                    ...newEntry
                })
            });
            if (!response.ok) throw new Error((await response.json()).error || "Failed to add to pipeline.");
            alert("Film added to pipeline successfully! You can now find it below to create the movie.");
            setNewEntry(emptyEntry);
            setIsFormVisible(false);
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewEntry(prev => ({ ...prev, [name]: value }));
    };

    const formInputClasses = "form-input";

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Submission Pipeline ({pipeline.length})</h2>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <button onClick={() => setIsFormVisible(!isFormVisible)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                    {isFormVisible ? 'Cancel Manual Entry' : '+ Add Entry Manually'}
                </button>

                {isFormVisible && (
                    <form onSubmit={handleManualSubmit} className="mt-6 space-y-4 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="form-label">Film Title</label>
                                <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} className={formInputClasses} required />
                            </div>
                            <div>
                                <label className="form-label">Director's Name</label>
                                <input type="text" name="director" value={newEntry.director} onChange={handleInputChange} className={formInputClasses} required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Main Cast (comma-separated)</label>
                            <input type="text" name="cast" value={newEntry.cast} onChange={handleInputChange} className={formInputClasses} required />
                        </div>
                        <div>
                            <label className="form-label">Contact Email</label>
                            <input type="email" name="submitterEmail" value={newEntry.submitterEmail} onChange={handleInputChange} className={formInputClasses} required />
                        </div>
                        <div>
                            <label className="form-label">Synopsis</label>
                            <textarea name="synopsis" value={newEntry.synopsis} onChange={handleInputChange} rows={3} className={formInputClasses} required></textarea>
                        </div>
                        <div>
                            <label className="form-label">Poster URL</label>
                            <input type="text" name="posterUrl" value={newEntry.posterUrl} onChange={handleInputChange} className={formInputClasses} required />
                        </div>
                        <div>
                            <label className="form-label">Movie File URL</label>
                            <input type="text" name="movieUrl" value={newEntry.movieUrl} onChange={handleInputChange} className={formInputClasses} required />
                        </div>
                         {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add to Pipeline'}
                        </button>
                    </form>
                )}
            </div>

            {pipeline.length === 0 && !isFormVisible && (
                <div className="text-center py-16 bg-gray-800/50 rounded-lg">
                    <h3 className="text-xl font-bold text-white">Pipeline is Empty</h3>
                    <p className="text-gray-400 mt-2">No new films have been submitted. You can add one manually above.</p>
                </div>
            )}

            {pipeline.map(item => (
                <div key={item.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 flex flex-col items-center">
                            <img src={item.posterUrl} alt={item.title} className="w-48 h-auto object-contain rounded-md mb-4"/>
                            <div className="flex gap-4">
                                <a href={item.posterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">View Poster</a>
                                <a href={item.movieUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">View Movie</a>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <h3 className="text-xl font-bold text-white">{item.title}</h3>
                            <p className="text-sm text-gray-400">by {item.director}</p>
                            <p className="text-sm mt-2"><strong>Cast:</strong> {item.cast}</p>
                             <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => handleCreate(item)}
                                    disabled={processingId === item.id}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600"
                                >
                                    {processingId === item.id ? 'Creating...' : 'Create Movie'}
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={processingId === item.id}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600"
                                >
                                    {processingId === item.id ? 'Deleting...' : 'Delete Submission'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MoviePipelineTab;