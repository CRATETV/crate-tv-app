
import React, { useState, useRef, useMemo } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';
import html2canvas from 'html2canvas';
import S3Uploader from './S3Uploader';

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
            // Fix: SVG elements inside html2canvas often require explicit width/height
            const element = laurelRef.current;
            const canvas = await html2canvas(element, {
                backgroundColor: null,
                scale: 5, // Even higher res for printing
                logging: true,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 15000,
                onclone: (clonedDoc) => {
                    const svg = clonedDoc.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', '1200');
                        svg.setAttribute('height', '900');
                        svg.style.width = '1200px';
                        svg.style.height = '900px';
                    }
                }
            });
            
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const safeName = (selectedMovie?.title || 'laurel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            link.download = `cratetv_laurel_${safeName}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed. Please try opening this page in a different browser (Chrome works best) or check for ad-blockers.");
        } finally {
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
            alert(`Success! Award applied to "${selectedMovie.title}".`);
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
                <p className="text-gray-400">Generate professional festival laurels or upload your own custom design.</p>
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
                            <option value="">-- Select a Film --</option>
                            {allMovies.sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                <option key={m.key} value={m.key}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Option A: Generate Laurel</h3>
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
                                    <label className="form-label text-xs">Color</label>
                                    <div className="flex gap-2 mt-1">
                                        {['#FFFFFF', '#FFD700', '#C0C0C0'].map(c => (
                                            <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleDownload}
                                disabled={!selectedMovieKey || isDownloading}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isDownloading ? "Capturing..." : "Download High-Res Generator PNG"}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Option B: Use My Own Style</h3>
                        <p className="text-xs text-gray-500 mb-4 italic">If you have a laurel image from Canva/Photoshop, upload it here. It will override the generator.</p>
                        <S3Uploader 
                            label="Upload Transparent PNG Laurel" 
                            onUploadSuccess={(url) => setCustomUrl(url)} 
                        />
                        {customUrl && (
                            <div className="mt-2 flex items-center gap-2 text-green-400 text-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                Custom style ready to apply.
                            </div>
                        )}
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleApplyToPoster}
                            disabled={!selectedMovieKey || isApplying}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isApplying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Sync Award to Live Site"}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Current Selection Preview</h3>
                    <div 
                        className="bg-[#111] border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center w-full aspect-[4/3] relative overflow-hidden"
                    >
                        {customUrl ? (
                            <img src={customUrl} alt="Custom Laurel" className="w-3/4 h-auto object-contain animate-fadeIn" />
                        ) : (
                            <div ref={laurelRef} className="w-full h-full bg-transparent">
                                <LaurelPreview awardName={award} year={year} color={color} />
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-4 text-center max-w-sm">
                        This preview shows exactly how the award will appear overlaid on the film's poster.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LaurelManager;
