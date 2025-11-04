
import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for types to be relative.
import { Movie, Actor } from '../types';
import S3Uploader from './S3Uploader';

interface MovieEditorProps {
  movie: Movie;
  onSave: (movie: Movie) => void;
  onCancel: () => void;
  onDelete: (movieKey: string) => void;
}

const MovieEditor: React.FC<MovieEditorProps> = ({ movie, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Movie>(movie);

  useEffect(() => {
    setFormData(movie);
  }, [movie]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUrlUpdate = (field: keyof Movie, url: string) => {
    setFormData(prev => ({ ...prev, [field]: url }));
  };
  
  const handleCastChange = (index: number, field: keyof Actor, value: string) => {
    const updatedCast = [...formData.cast];
    updatedCast[index] = { ...updatedCast[index], [field]: value };
    setFormData(prev => ({ ...prev, cast: updatedCast }));
  };

  const handleCastUrlUpdate = (index: number, field: keyof Actor, url: string) => {
    handleCastChange(index, field, url);
  };

  const addCastMember = () => {
    setFormData(prev => ({
      ...prev,
      cast: [...prev.cast, { name: '', photo: '', bio: '', highResPhoto: '' }]
    }));
  };

  const removeCastMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cast: prev.cast.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, price: formData.isForSale ? 500 : 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-3xl font-bold text-red-400 mb-6">{movie.key.startsWith('newmovie') ? 'Add New Movie' : `Editing: ${movie.title}`}</h2>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-gray-300">Key (Unique ID)</label>
          <input type="text" name="key" value={formData.key} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" required />
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" required />
        </div>
      </div>
      <div>
        <label htmlFor="synopsis" className="block text-sm font-medium text-gray-300">Synopsis (HTML allowed)</label>
        <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Release Date */}
        <div>
          <label htmlFor="releaseDateTime" className="block text-sm font-medium text-gray-300">Release Date & Time (Optional)</label>
          <input type="datetime-local" name="releaseDateTime" value={formData.releaseDateTime || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
          <p className="text-xs text-gray-500 mt-1">Leave blank to release immediately.</p>
        </div>
        {/* Expiry Date */}
        <div>
          <label htmlFor="mainPageExpiry" className="block text-sm font-medium text-gray-300">Remove from Main Page on (Optional)</label>
          <input type="datetime-local" name="mainPageExpiry" value={formData.mainPageExpiry || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
          <p className="text-xs text-gray-500 mt-1">Movie will be hidden from carousels after this date.</p>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <label htmlFor="director" className="block text-sm font-medium text-gray-300">Director(s)</label>
          <input type="text" name="director" value={formData.director} onChange={handleChange} placeholder="Comma-separated names" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
        </div>
         <div>
          <label htmlFor="producers" className="block text-sm font-medium text-gray-300">Producer(s)</label>
          <input type="text" name="producers" value={formData.producers || ''} onChange={handleChange} placeholder="Comma-separated names" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
        </div>
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-300">Rating (out of 10)</label>
          <input type="number" name="rating" value={formData.rating || ''} onChange={handleChange} min="0" max="10" step="0.1" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
        </div>
        <div>
          <label htmlFor="durationInMinutes" className="block text-sm font-medium text-gray-300">Duration (in minutes)</label>
          <input type="number" name="durationInMinutes" value={formData.durationInMinutes || ''} onChange={handleChange} min="0" step="1" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
        </div>
        <div className="md:col-span-2 space-y-3 pt-2">
            <label className="flex items-center space-x-3 cursor-pointer">
                <input
                    type="checkbox"
                    name="isForSale"
                    checked={!!formData.isForSale}
                    onChange={handleChange}
                    className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-300 font-medium">Mark this film for sale ($5.00)</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
                <input
                    type="checkbox"
                    name="hasCopyrightMusic"
                    checked={!!formData.hasCopyrightMusic}
                    onChange={handleChange}
                    className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-gray-300 font-medium">Contains Copyrighted Music (Disables Donations)</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
                <input
                    type="checkbox"
                    name="isWatchPartyEligible"
                    checked={!!formData.isWatchPartyEligible}
                    onChange={handleChange}
                    className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300 font-medium">Eligible for Watch Party</span>
            </label>
        </div>
      </div>
      
      {/* URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
            <label htmlFor="poster" className="block text-sm font-medium text-gray-300">Poster URL (for Web App)</label>
            <input type="text" name="poster" value={formData.poster} onChange={handleChange} className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
            <S3Uploader label="Or Upload Poster" onUploadSuccess={(url) => handleUrlUpdate('poster', url)} />
        </div>
         <div className="space-y-2">
          <label htmlFor="trailer" className="block text-sm font-medium text-gray-300">Trailer URL</label>
          <input type="text" name="trailer" value={formData.trailer} onChange={handleChange} className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
          <S3Uploader label="Or Upload Trailer" onUploadSuccess={(url) => handleUrlUpdate('trailer', url)} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label htmlFor="fullMovie" className="block text-sm font-medium text-gray-300">Full Movie URL</label>
          <input type="text" name="fullMovie" value={formData.fullMovie} onChange={handleChange} className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
          <S3Uploader label="Or Upload Full Movie" onUploadSuccess={(url) => handleUrlUpdate('fullMovie', url)} />
        </div>
      </div>

      {/* Cast */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Cast Members</h3>
        <div className="space-y-4">
          {formData.cast.map((actor, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700 relative">
              <button type="button" onClick={() => removeCastMember(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">&times;</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Actor Name" value={actor.name} onChange={e => handleCastChange(index, 'name', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                <div className="space-y-2">
                    <input type="text" placeholder="Photo URL (small)" value={actor.photo} onChange={e => handleCastChange(index, 'photo', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    <S3Uploader label="Upload Small Photo" onUploadSuccess={(url) => handleCastUrlUpdate(index, 'photo', url)} />
                </div>
                <div className="space-y-2">
                    <input type="text" placeholder="High-Res Photo URL" value={actor.highResPhoto} onChange={e => handleCastChange(index, 'highResPhoto', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    <S3Uploader label="Upload High-Res Photo" onUploadSuccess={(url) => handleCastUrlUpdate(index, 'highResPhoto', url)} />
                </div>
                 <textarea placeholder="Bio" value={actor.bio} onChange={e => handleCastChange(index, 'bio', e.target.value)} className="md:col-span-2 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" rows={2}/>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCastMember} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">+ Add Cast Member</button>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition">Save</button>
            <button type="button" onClick={onCancel} className="ml-4 text-gray-400 hover:text-white transition">Cancel</button>
        </div>
        {!movie.key.startsWith('newmovie') && (
            <button
              type="button"
              onClick={() => onDelete(movie.key)}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md transition text-sm"
            >
              Delete Movie
            </button>
        )}
      </div>
    </form>
  );
};

export default MovieEditor;
