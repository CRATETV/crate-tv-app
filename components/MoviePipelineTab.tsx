import React, { useState } from 'react';
import { MoviePipelineEntry } from '../types';
import { deleteMoviePipelineEntry } from '../services/firebaseService';

interface MoviePipelineTabProps {
    pipeline: MoviePipelineEntry[];
    onCreateMovie: (item: MoviePipelineEntry) => void;
}

const MoviePipelineTab: React.FC<MoviePipelineTabProps> = ({ pipeline, onCreateMovie }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this submission? This cannot be undone.")) return;
        setProcessingId(id);
        try {
            await deleteMoviePipelineEntry(id);
            // Parent component's data refresh will handle UI update.
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

    if (!pipeline || pipeline.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800/50 rounded-lg">
                <h3 className="text-xl font-bold text-white">Pipeline is Empty</h3>
                <p className="text-gray-400 mt-2">No new films have been submitted.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Submission Pipeline ({pipeline.length})</h2>
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
