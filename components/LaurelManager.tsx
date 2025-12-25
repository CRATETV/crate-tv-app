
import React, { useState, useRef, useMemo } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';

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

const PRESET_FINISHES = [
    { name: 'White', val: '#FFFFFF' },
    { name: 'Black', val: '#000000' },
    { name: 'Gold', val: '#FFD700' },
    { name: 'Silver', val: '#D1D5DB' },
];

const LaurelManager: React.FC<LaurelManagerProps> = ({ allMovies }) => {
    const [selectedMovieKey, setSelectedMovieKey] = useState('');
    const [award, setAward] = useState('Official Selection');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [color, setColor] = useState('#FFFFFF');
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
            const sourceSvg = laurelRef.current.querySelector('svg');
            if (!sourceSvg) throw new Error("SVG not found");

            // Clone SVG to modify it for export without affecting the UI
            const svgElement = sourceSvg.cloneNode(true) as SVGSVGElement;
            svgElement.setAttribute('width', '2400');
            svgElement.setAttribute('height', '2000');

            const canvas = document.createElement('canvas');
            canvas.width = 2400;
            canvas.height = 2000;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, 2400, 2000);
                
                const pngUrl = canvas.toDataURL('image/png', 1.0);
                const downloadLink = document.createElement('a');
                const safeName = (selectedMovie?.title || 'crate_award').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                
                downloadLink.download = `${safeName}_laurel_${award.toLowerCase().replace(/\s/g, '_')}.png`;
                downloadLink.href = pngUrl;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                URL.revokeObjectURL(url);
                setIsDownloading(false);
            };

            img.onerror = (e) => {
                console.error("Image loading error", e);
                setIsDownloading(false);
                alert("Failed to render the image for download. Please try again.");
            };

            img.src = url;

        } catch (err) {
            console.error("Download failed:", err);
            setIsDownloading(false);
            alert("An error occurred while preparing your download.");
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
                customLaurelUrl: ''
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
            alert(`Award branding successfully synced for "${selectedMovie.title}".`);
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">Modern Award Studio</h2>
                <p className="text-gray-400">Design sharpened, minimalist laurels. Sync directly to the film poster or export as a transparent high-res PNG for marketing.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Control Panel */}
                <div className="bg-gray-800/40 p-8 rounded-2xl border border-white/5 space-y-8">
                    <div>
                        <label className="form-label text-red-400 font-bold uppercase tracking-widest text-xs">Target Film</label>
                        <select 
                            value={selectedMovieKey} 
                            onChange={(e) => setSelectedMovieKey(e.target.value)}
                            className="form-input"
                        >
                            <option value="">-- Select Movie --</option>
                            {allMovies.sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                <option key={m.key} value={m.key}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label text-[10px] text-gray-500 uppercase">Award Category</label>
                                <select value={award} onChange={(e) => setAward(e.target.value)} className="form-input">
                                    {AWARD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label text-[10px] text-gray-500 uppercase">Event Year</label>
                                <input type="text" value={year} onChange={(e) => setYear(e.target.value)} className="form-input" />
                            </div>
                        </div>

                        <div>
                            <label className="form-label text-[10px] text-gray-500 uppercase">Leaf Color / Finish</label>
                            <div className="flex flex-wrap gap-3 mt-1">
                                {PRESET_FINISHES.map(f => (
                                    <button 
                                        key={f.name} 
                                        type="button"
                                        onClick={() => setColor(f.val)} 
                                        className={`flex flex-col items-center gap-2 transition-all p-2 rounded-lg ${color === f.val ? 'bg-white/10 ring-1 ring-white/30' : 'opacity-40 hover:opacity-100'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full border border-white/20 shadow-lg" style={{ backgroundColor: f.val }} />
                                        <span className="text-[10px] font-bold text-white uppercase">{f.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                            >
                                {isDownloading ? "Rendering..." : "Download HD PNG"}
                            </button>
                            <button
                                onClick={handleApplyToPoster}
                                disabled={!selectedMovieKey || isApplying}
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-700"
                            >
                                {isApplying ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Sync to Live Site"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="flex flex-col items-center">
                    <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-8">Award Geometry Preview</h3>
                    <div 
                        className={`border border-white/5 rounded-[2.5rem] flex items-center justify-center w-full aspect-[4/3] relative overflow-hidden transition-colors duration-500 shadow-[inset_0_0_80px_rgba(0,0,0,1)] ${color === '#000000' ? 'bg-white' : 'bg-[#020202]'}`}
                    >
                        <div ref={laurelRef} className="w-full h-full bg-transparent">
                            <LaurelPreview awardName={award} year={year} color={color} />
                        </div>
                        <div className={`absolute bottom-6 text-[9px] font-black uppercase tracking-[0.5em] pointer-events-none italic ${color === '#000000' ? 'text-gray-400' : 'text-gray-700'}`}>
                            Transparent Background Output
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaurelManager;
