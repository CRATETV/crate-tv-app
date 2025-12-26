
import React, { useState, useEffect } from 'react';
import { AboutData } from '../types';

interface AboutEditorProps {
    initialData: AboutData;
    onSave: (data: AboutData) => void;
    isSaving: boolean;
}

const AboutEditor: React.FC<AboutEditorProps> = ({ initialData, onSave, isSaving }) => {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(data);
    };

    const inputClass = "w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500";
    const labelClass = "block text-sm font-medium text-gray-300 mb-1";

    return (
        <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-red-400">Edit 'About Us' Page Content</h2>
            
            <div>
                <label htmlFor="missionStatement" className={labelClass}>Mission Statement</label>
                <textarea name="missionStatement" value={data.missionStatement} onChange={handleChange} rows={3} className={inputClass} />
            </div>
            
            <div>
                <label htmlFor="story" className={labelClass}>Our Story (HTML allowed)</label>
                <textarea name="story" value={data.story} onChange={handleChange} rows={5} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
                    <label htmlFor="belief1Title" className={labelClass}>Pillar 1 Title</label>
                    <input type="text" name="belief1Title" value={data.belief1Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief1Body" className={`${labelClass} mt-4`}>Pillar 1 Body</label>
                    <textarea name="belief1Body" value={data.belief1Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
                <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
                    <label htmlFor="belief2Title" className={labelClass}>Pillar 2 Title</label>
                    <input type="text" name="belief2Title" value={data.belief2Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief2Body" className={`${labelClass} mt-4`}>Pillar 2 Body</label>
                    <textarea name="belief2Body" value={data.belief2Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
                <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
                    <label htmlFor="belief3Title" className={labelClass}>Pillar 3 Title</label>
                    <input type="text" name="belief3Title" value={data.belief3Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief3Body" className={`${labelClass} mt-4`}>Pillar Pillar 3 Body</label>
                    <textarea name="belief3Body" value={data.belief3Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-5 rounded-md transition-colors shadow-lg"
                >
                    {isSaving ? 'Publishing...' : "Save & Publish About Page"}
                </button>
                <p className="text-xs text-gray-500 mt-2 italic">Note: Individual names and photos for the 'Collective' section are managed internally. These fields update the core narrative pillars.</p>
            </div>
        </div>
    );
};

export default AboutEditor;
