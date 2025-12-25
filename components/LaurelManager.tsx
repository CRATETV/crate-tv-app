
import React, { useState, useRef, useMemo } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';
import PublicS3Uploader from './PublicS3Uploader';

interface LaurelManagerProps {
    allMovies: Movie[];
}

const AWARD_CATEGORIES = [
    "Official Selection",
    "Audience Choice",
    "Grand Jury Prize",
    "Best Short Film",
    "Best Director",
    "Best Screenplay",
    "Best Performance",
    "Best Cinematography",
    "Best Documentary Short",
    "Best Animation Selection",
    "Best Web Series / Episodic",
    "Best Student Film"
];

const LaurelManager: React.FC<LaurelManagerProps> = ({ allMovies }) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState('');
    const [award, setAward] = useState('Official Selection');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [color, setColor] = useState('#FFFFFF');
    const [customUrl, setCustomUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    
    const laurelRef = useRef<HTMLDivElement>(null);

    const selectedMovie = useMemo(() => 
        allMovies.find(m => m.key === selectedMovieKey), 
    [selectedMovieKey, allMovies]);

    const handleDownload = async () => {
        if (!laurelRef.current || isDownloading) return;
        setIsDownloading(true);
        
        try {
            const svgElement = laurelRef.current.querySelector('svg');
            if (!svgElement) throw new Error("SVG not found");

            // Serialize SVG to XML
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const svgSize = svgElement.viewBox.baseVal;
            
            // Set canvas to high resolution (4x size)
            canvas.width = svgSize.width * 4;
            canvas.height = svgSize.height * 4;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const pngUrl = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                const safeName = (selectedMovie?.title || 'laurel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                downloadLink.download = `cratetv_award_${safeName}.png`;
                downloadLink.href = pngUrl;
                downloadLink.click();
                URL.revokeObjectURL(url);
                setIsDownloading(false);
            };
            img.src = url;

        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed. Please ensure your browser allows popups or try another browser.");
            setIsDownloading(false);
        }
    };

    const handleApplyToPoster = async () => {
        if (!selectedMovie || isApplying) return;
        
        setIsApplying(true);
        try {
            const password = sessionStorage.getItem('adminPassword');
            const updatedMovie = {
                ...selectedMovie,
                awardName: award,
                awardYear: year,
                customLaurelUrl: customUrl || selectedMovie.customLaurelUrl || ''
            };
            
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    type: 'movies', 
                    data: { [selectedMovie.key]: updatedMovie } 
                }),
            });

            if (!response.ok) throw new Error('Failed to update live site.');
            alert(`Award style successfully applied to "${selectedMovie.title}".`);
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">Award & Laurel System</h2>
                <p className="text-gray-400">Generate professional metallic laurels or upload a unique style for this film.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Controls */}
                <div className="bg-gray-800/40 p-8 rounded-2xl border border-white/5 space-y-6">
                    <div>
                        <label className="form-label text-red-400 font-bold">1. Target Film</label>
                        <select 
                            value={selectedMovieKey} 
                            onChange={(e) => {
                                setSelectedMovieKey(e.target.value);
                                const m = allMovies.find(mv => mv.key === e.target.value);
                                if (m?.customLaurelUrl) setCustomUrl(m.customLaurelUrl);
                                else setCustomUrl('');
                            }}
                            className="form-input"
                        >
                            <option value="">-- Select Film --</option>
                            {allMovies.sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                <option key={m.key} value={m.key}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Branding Option A: 3D Generator</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label text-xs">Category</label>
                                <select value={award} onChange={(e) => setAward(e.target.value)} className="form-input">
                                    {AWARD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label text-xs">Year</label>
                                    <input type="text" value={year} onChange={(e) => setYear(e.target.value)} className="form-input" />
                                </div>
                                <div>
                                    <label className="form-label text-xs">Metal Finish</label>
                                    <div className="flex gap-2 mt-1">
                                        {[
                                            { name: 'Silver', val: '#D1D5DB' },
                                            { name: 'Gold', val: '#FFD700' },
                                            { name: 'Platinum', val: '#F3F4F6' }
                                        ].map(c => (
                                            <button key={c.name} onClick={() => setColor(c.val)} className={`w-8 h-8 rounded-full border-2 ${color === c.val ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c.val }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleDownload}
                                disabled={!selectedMovieKey || isDownloading}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isDownloading ? "Rasterizing..." : "Download High-Res PNG"}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Branding Option B: Upload Own Style</h3>
                        <p className="text-xs text-gray-500 mb-4 italic">Override the generator with your own designed laurel from Canva/Photoshop.</p>
                        <PublicS3Uploader 
                            label="Upload Transparent Award PNG" 
                            onUploadSuccess={(url) => setCustomUrl(url)} 
                        />
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleApplyToPoster}
                            disabled={!selectedMovieKey || isApplying}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isApplying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Apply & Publish to Live Site"}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Selection Preview</h3>
                    <div 
                        className="bg-[#050505] border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center w-full aspect-[4/3] relative overflow-hidden shadow-inner"
                    >
                        {customUrl ? (
                            <img src={customUrl} alt="Custom Style" className="w-4/5 h-auto object-contain animate-fadeIn" />
                        ) : (
                            <div ref={laurelRef} className="w-full h-full bg-transparent">
                                <LaurelPreview awardName={award} year={year} color={color} />
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-4 text-center max-w-sm italic">
                        The background is transparent. This preview uses a dark background for contrast.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LaurelManager;
