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

export const MoviePipelineTab: React.FC<MoviePipelineTabProps> = ({ pipeline, onCreateMovie, onRefresh }) => {
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
            onRefresh();
        } catch (error) {
            alert(`Failed to delete submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreate = (item: MoviePipelineEntry) => {
        setProcessingId(item.id);
        onCreateMovie(item);
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
            alert("Film added to pipeline successfully!");
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

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Submission Pipeline ({pipeline.length})</h2>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <button onClick={() => setIsFormVisible(!isFormVisible)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                    {isFormVisible ? 'Cancel Manual Entry' : '+ Add Entry Manually'}
                </button>

                {isFormVisible && (
                    <form onSubmit={handleManualSubmit} className="mt-6 space-y-4 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="form-label">Film Title</label>
                                <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">Director's Name</label>
                                <input type="text" name="director" value={newEntry.director} onChange={handleInputChange} className="form-input" required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Main Cast (comma-separated)</label>
                            <input type="text" name="cast" value={newEntry.cast} onChange={handleInputChange} className="form-input" required />
                        </div>
                        <div>
                            <label className="form-label">Synopsis</label>
                            <textarea name="synopsis" value={newEntry.synopsis} onChange={handleInputChange} rows={3} className="form-input" required></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Poster URL</label>
                                <input type="text" name="posterUrl" value={newEntry.posterUrl} onChange={handleInputChange} className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">Movie File URL</label>
                                <input type="text" name="movieUrl" value={newEntry.movieUrl} onChange={handleInputChange} className="form-input" required />
                            </div>
                        </div>
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add to Pipeline'}
                        </button>
                    </form>
                )}
            </div>

            {pipeline.length > 0 ? (
                <div className="space-y-4">
                    {pipeline.map(item => (
                        <div key={item.id} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-gray-500 transition-colors">
                            <div className="flex flex-col md:flex-row gap-6">
                                <img src={item.posterUrl} alt={item.title} className="w-32 h-48 object-cover rounded-xl flex-shrink-0 shadow-lg" />
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{item.title}</h3>
                                            <p className="text-red-500 font-bold uppercase text-[10px] tracking-widest mt-1">Directed by {item.director}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-4 line-clamp-3 italic leading-relaxed">"{item.synopsis}"</p>
                                    
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleCreate(item)}
                                            disabled={processingId === item.id}
                                            className="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-lg text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                        >
                                            {processingId === item.id ? 'Creating...' : 'Approve & Create'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={processingId === item.id}
                                            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-2.5 px-6 rounded-lg text-[10px] uppercase tracking-widest border border-red-500/30 transition-all"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                    <p className="text-gray-600 font-bold uppercase tracking-[0.4em]">Pipeline Empty</p>
                </div>
            )}
        </div>
    );
};