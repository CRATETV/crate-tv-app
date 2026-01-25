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
            const payload = {
                filmTitle: newEntry.title,
                directorName: newEntry.director,
                email: newEntry.submitterEmail,
                cast: newEntry.cast,
                synopsis: newEntry.synopsis,
                posterUrl: newEntry.posterUrl,
                movieUrl: newEntry.movieUrl
            };

            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to add to pipeline.");
            }
            
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

    const handleExportCSV = () => {
        const headers = ["Title", "Director", "Cast", "Synopsis", "Poster URL", "Movie URL", "Submitter Email", "Date"];
        const rows = pipeline.map(item => [
            `"${item.title.replace(/"/g, '""')}"`,
            `"${item.director.replace(/"/g, '""')}"`,
            `"${item.cast.replace(/"/g, '""')}"`,
            `"${item.synopsis.replace(/"/g, '""')}"`,
            `"${item.posterUrl}"`,
            `"${item.movieUrl}"`,
            `"${item.submitterEmail}"`,
            item.submissionDate?.seconds ? new Date(item.submissionDate.seconds * 1000).toISOString() : '---'
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CRATE_PIPELINE_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Submission Pipeline ({pipeline.length})</h2>
                <button 
                    onClick={handleExportCSV}
                    className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                >
                    Export Spreadsheet (.csv)
                </button>
            </div>
            
            <div className="bg-[#0f0f0f] p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Manual Entry Protocol</h3>
                    <button onClick={() => setIsFormVisible(!isFormVisible)} className="text-xs bg-red-600 hover:bg-red-700 text-white font-black py-2 px-6 rounded-xl shadow-xl transition-all">
                        {isFormVisible ? 'Hide Ingestion Interface' : 'Ingest Film into Jury Room'}
                    </button>
                </div>

                {isFormVisible && (
                    <form onSubmit={handleManualSubmit} className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="form-label">Film Title</label>
                                <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                            <div>
                                <label className="form-label">Director's Name</label>
                                <input type="text" name="director" value={newEntry.director} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Main Cast (comma-separated)</label>
                            <input type="text" name="cast" value={newEntry.cast} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                        </div>
                        <div>
                            <label className="form-label">Synopsis</label>
                            <textarea name="synopsis" value={newEntry.synopsis} onChange={handleInputChange} rows={3} className="form-input bg-black/40 border-white/10" required></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="form-label">Poster URL</label>
                                <input type="text" name="posterUrl" value={newEntry.posterUrl} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                            <div>
                                <label className="form-label">Movie File URL</label>
                                <input type="text" name="movieUrl" value={newEntry.movieUrl} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="form-label">Submitter Email</label>
                                <input type="email" name="submitterEmail" value={newEntry.submitterEmail} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>
                        
                        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}
                        
                        <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all hover:scale-[1.01] active:scale-95" disabled={isSubmitting}>
                            {isSubmitting ? 'Ingesting Node...' : 'Authorize Manual Ingestion'}
                        </button>
                    </form>
                )}
            </div>

            {pipeline.length > 0 ? (
                <div className="space-y-4">
                    {pipeline.map(item => (
                        <div key={item.id} className="bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex flex-col md:flex-row gap-8">
                                <img src={item.posterUrl} alt={item.title} className="w-32 h-48 object-cover rounded-2xl flex-shrink-0 shadow-2xl border border-white/10" />
                                <div className="flex-grow min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{item.title}</h3>
                                            <p className="text-red-500 font-bold uppercase text-[9px] tracking-[0.4em] mt-3">DIRECTOR: {item.director}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-6 line-clamp-2 italic leading-relaxed font-medium">"{item.synopsis}"</p>
                                    
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <button
                                            onClick={() => handleCreate(item)}
                                            disabled={processingId === item.id}
                                            className="bg-white text-black font-black py-2.5 px-10 rounded-xl text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            {processingId === item.id ? 'Creating...' : 'Finalize Catalog Entry'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={processingId === item.id}
                                            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all"
                                        >
                                            Purge
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em]">Pipeline Manifest Empty</p>
                </div>
            )}
        </div>
    );
};
