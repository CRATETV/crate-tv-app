import React, { useState, useEffect } from 'react';
import { Movie, Actor } from '../types.ts';

interface MovieEditorProps {
  movie: Movie;
  onSave: (movie: Movie) => void;
  onClose: () => void;
}

const MovieEditor: React.FC<MovieEditorProps> = ({ movie, onSave, onClose }) => {
  const [formData, setFormData] = useState<Movie>(movie);

  useEffect(() => {
    setFormData(movie);
  }, [movie]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCastChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newCast = [...formData.cast];
    newCast[index] = { ...newCast[index], [name]: value };
    setFormData(prev => ({ ...prev, cast: newCast }));
  };

  const addCastMember = () => {
    const newActor: Actor = { name: '', photo: '', bio: '', highResPhoto: ''};
    setFormData(prev => ({...prev, cast: [...prev.cast, newActor]}));
  };
  
  const removeCastMember = (index: number) => {
    setFormData(prev => ({...prev, cast: prev.cast.filter((_, i) => i !== index)}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] relative border border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="overflow-y-auto max-h-[90vh] p-8">
          <h2 className="text-3xl font-bold mb-6 text-white">{movie.key.startsWith('new') ? 'Add New Movie' : `Editing: ${movie.title}`}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-300">Key</label><input type="text" name="key" value={formData.key} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" required /></div>
                <div><label className="block text-sm font-medium text-gray-300">Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" required /></div>
                <div><label className="block text-sm font-medium text-gray-300">Director</label><input type="text" name="director" value={formData.director} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Release Date (Optional)</label><input type="date" name="releaseDate" value={formData.releaseDate || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Poster URL</label><input type="text" name="poster" value={formData.poster} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Trailer URL</label><input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Full Movie URL</label><input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Synopsis</label>
                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={12} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"></textarea>
              </div>
            </div>

            {/* Cast Details */}
            <div className="pt-4 border-t border-gray-700">
                <h3 className="text-xl font-semibold mb-3">Cast</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                    {formData.cast.map((actor, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-700 rounded-md relative">
                            <button type="button" onClick={() => removeCastMember(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-200 text-xs">Remove</button>
                            <input type="text" name="name" placeholder="Actor Name" value={actor.name} onChange={(e) => handleCastChange(index, e)} className="bg-gray-600 rounded p-2" />
                            <input type="text" name="photo" placeholder="Photo URL" value={actor.photo} onChange={(e) => handleCastChange(index, e)} className="bg-gray-600 rounded p-2" />
                            <input type="text" name="highResPhoto" placeholder="High-Res Photo URL" value={actor.highResPhoto} onChange={(e) => handleCastChange(index, e)} className="bg-gray-600 rounded p-2" />
                             <textarea name="bio" placeholder="Bio" value={actor.bio} onChange={(e) => handleCastChange(index, e)} className="md:col-span-3 bg-gray-600 rounded p-2" rows={2}></textarea>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addCastMember} className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md text-sm">Add Cast Member</button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
                <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md transition-colors">Cancel</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors">Save Movie</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MovieEditor;