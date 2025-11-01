import React, { useState } from 'react';
import { MoviePipelineEntry } from '../types';
import { addMoviePipelineEntry, deleteMoviePipelineEntry } from '../services/firebaseService';

interface MoviePipelineTabProps {
    pipeline: MoviePipelineEntry[];
    onCreateMovie: (item: MoviePipelineEntry) => void;
}

const MoviePipelineTab: React.FC<MoviePipelineTabProps> = ({ pipeline, onCreateMovie }) => {
    const [newEntry, setNewEntry] = useState({ title: '', posterUrl: '', movieUrl: '', cast: '', director: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleAddEntry = async () => {
        if (!newEntry.title) return;
        setIsSubmitting(true);
        try {
            await addMoviePipelineEntry(newEntry);
            setNewEntry({ title: '', posterUrl: '', movieUrl: '', cast: '', director: '' });
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to add pipeline entry:", error);
            // You might want to show an error to the user here
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this pipeline entry?")) {
            await deleteMoviePipelineEntry(id);
        }
    };

    const handleDownload = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Title,Poster URL,Movie URL,Cast,Director\n" 
            + pipeline.map(item => `"${item.title.replace(/"/g, '""')}","${item.posterUrl}","${item.movieUrl}","${item.cast.replace(/"/g, '""')}","${item.director.replace(/"/g, '""')}"`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "movie_pipeline.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const inputClass = "w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-blue-500";

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Movie Submission Pipeline</h2>
                <button onClick={handleDownload} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">Download CSV</button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th className="p-3">Title</th>
                            <th className="p-3">Poster URL</th>
                            <th className="p-3">Movie URL</th>
                            <th className="p-3">Cast</th>
                            <th className="p-3">Director(s)</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pipeline.map(item => (
                            <tr key={item.id} className="border-b border-gray-700">
                                <td className="p-3 font-medium text-white">{item.title}</td>
                                <td className="p-3 text-sm text-gray-400 truncate max-w-xs">{item.posterUrl}</td>
                                <td className="p-3 text-sm text-gray-400 truncate max-w-xs">{item.movieUrl}</td>
                                <td className="p-3 text-sm text-gray-400">{item.cast}</td>
                                <td className="p-3 text-sm text-gray-400">{item.director}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => onCreateMovie(item)} className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md">Create Movie</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isAdding ? (
                <div className="mt-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Add New Pipeline Entry</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} placeholder="Movie Title" className={inputClass} required />
                        <input type="text" name="director" value={newEntry.director} onChange={handleInputChange} placeholder="Director(s), comma-separated" className={inputClass} />
                        <div className="md:col-span-2">
                            <input type="text" name="cast" value={newEntry.cast} onChange={handleInputChange} placeholder="Main Cast, comma-separated" className={inputClass} />
                        </div>
                        <input type="url" name="posterUrl" value={newEntry.posterUrl} onChange={handleInputChange} placeholder="Poster Image URL" className={inputClass} />
                        <input type="url" name="movieUrl" value={newEntry.movieUrl} onChange={handleInputChange} placeholder="Full Movie File URL" className={inputClass} />
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleAddEntry} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                            {isSubmitting ? 'Saving...' : 'Save Entry'}
                        </button>
                        <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setIsAdding(true)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                    + Add New Entry
                </button>
            )}
        </div>
    );
};

export default MoviePipelineTab;