import React, { useState, useEffect } from 'react';
import { Category, Movie } from '../types';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}

const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, onSave, onClose }) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(initialSelectedKeys));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSelection = (key: string) => {
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedKeys(newSelection);
  };

  const handleSave = () => {
    onSave(Array.from(selectedKeys));
  };

  const filteredMovies = allMovies
    .filter(movie => movie.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-600" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Select Films for Category</h3>
          <input
            type="text"
            placeholder="Search films..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500"
          />
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(movie.key)}
                  onChange={() => toggleSelection(movie.key)}
                  className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-200">{movie.title}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Save Selection</button>
        </div>
      </div>
    </div>
  );
};


interface CategoryEditorProps {
  initialCategories: Record<string, Category>;
  allMovies: Movie[];
  onSave: (newCategories: Record<string, Category>) => void;
  isSaving: boolean;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({ initialCategories, allMovies, onSave, isSaving }) => {
  const [categories, setCategories] = useState<Record<string, Category>>(initialCategories);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleCategoryChange = (key: string, field: 'title', value: string) => {
    setCategories(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleMovieSelectionSave = (categoryKey: string, newMovieKeys: string[]) => {
    setCategories(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], movieKeys: newMovieKeys },
    }));
    setEditingCategoryKey(null);
  };

  const addNewCategory = () => {
    const newKey = `category${Date.now()}`;
    const newCategory: Category = {
      title: 'New Category',
      movieKeys: [],
    };
    setCategories(prev => ({ ...prev, [newKey]: newCategory }));
  };

  const deleteCategory = (key: string) => {
    if (window.confirm(`Are you sure you want to delete the category "${categories[key].title}"?`)) {
      setCategories(prev => {
        const newCategories = { ...prev };
        delete newCategories[key];
        return newCategories;
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-red-400">Manage Categories</h2>
        <button onClick={addNewCategory} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">
          + Add Category
        </button>
      </div>

      <div className="space-y-4">
        {/* FIX: Add an explicit type to the destructured map parameters to resolve TypeScript errors. */}
        {Object.entries(categories).map(([key, category]: [string, Category]) => (
          <div key={key} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <input
                type="text"
                value={category.title}
                onChange={e => handleCategoryChange(key, 'title', e.target.value)}
                className="text-lg font-semibold bg-transparent text-white focus:outline-none focus:bg-gray-700 rounded-md px-2 w-full"
              />
              <button onClick={() => deleteCategory(key)} className="text-xs text-red-500 hover:text-red-400 ml-4">Delete</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">{category.movieKeys.length} film(s) in this category.</p>
            <button
              onClick={() => setEditingCategoryKey(key)}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm"
            >
              Edit Films
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-700">
        <button
          onClick={() => onSave(categories)}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-5 rounded-md transition-colors"
        >
          {isSaving ? 'Publishing...' : 'Save & Publish Categories'}
        </button>
      </div>

      {editingCategoryKey && (
        <MovieSelectorModal
          allMovies={allMovies}
          initialSelectedKeys={categories[editingCategoryKey].movieKeys}
          onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)}
          onClose={() => setEditingCategoryKey(null)}
        />
      )}
    </div>
  );
};

export default CategoryEditor;