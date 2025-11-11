import React, { useState, useEffect } from 'react';
import { AboutData } from '../types';
import S3Uploader from './S3Uploader';

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
    
    const handleUrlUpdate = (field: keyof AboutData, url: string) => {
        setData(prev => ({ ...prev, [field]: url }));
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
                <div>
                    <label htmlFor="belief1Title" className={labelClass}>Belief 1 Title</label>
                    <input type="text" name="belief1Title" value={data.belief1Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief1Body" className={`${labelClass} mt-2`}>Belief 1 Body</label>
                    <textarea name="belief1Body" value={data.belief1Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="belief2Title" className={labelClass}>Belief 2 Title</label>
                    <input type="text" name="belief2Title" value={data.belief2Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief2Body" className={`${labelClass} mt-2`}>Belief 2 Body</label>
                    <textarea name="belief2Body" value={data.belief2Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="belief3Title" className={labelClass}>Belief 3 Title</label>
                    <input type="text" name="belief3Title" value={data.belief3Title} onChange={handleChange} className={inputClass} />
                    <label htmlFor="belief3Body" className={`${labelClass} mt-2`}>Belief 3 Body</label>
                    <textarea name="belief3Body" value={data.belief3Body} onChange={handleChange} rows={3} className={inputClass} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Founder Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="founderName" className={labelClass}>Founder Name</label>
                        <input type="text" name="founderName" value={data.founderName} onChange={handleChange} className={inputClass} />
                    </div>
                     <div>
                        <label htmlFor="founderTitle" className={labelClass}>Founder Title</label>
                        <input type="text" name="founderTitle" value={data.founderTitle} onChange={handleChange} className={inputClass} />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="founderBio" className={labelClass}>Founder Bio</label>
                        <textarea name="founderBio" value={data.founderBio} onChange={handleChange} rows={4} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="founderPhoto" className={labelClass}>Founder Photo URL</label>
                        <input type="text" name="founderPhoto" value={data.founderPhoto} onChange={handleChange} className={inputClass} />
                         <div className="mt-2">
                            <S3Uploader label="Or Upload New Photo" onUploadSuccess={(url) => handleUrlUpdate('founderPhoto', url)} />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-5 rounded-md transition-colors"
                >
                    {isSaving ? 'Publishing...' : "Save & Publish About Page"}
                </button>
            </div>
        </div>
    );
};

export default AboutEditor;