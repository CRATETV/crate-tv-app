
import React, { useState, useRef, useMemo } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';
import html2canvas from 'html2canvas';

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
    const [color, setColor] = useState('#FFFFFF'); // White default
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
            // We must wait for styles to calculate
            const canvas = await html2canvas(laurelRef.current, {
                backgroundColor: null,
                scale: 4, // Ultra-high-res
                logging: false,
                useCORS: true,
                allowTaint: true,
                onclone: (clonedDoc) => {
                    // Ensure the SVG is fully opaque for capture
                    const svg = clonedDoc.querySelector('svg');
                    if (svg) {
                        svg.style.width = '2400px';
                        svg.style.height = '1800px';
                    }
                }
            });
            
            const link = document.createElement('a');
            const safeName = (selectedMovie?.title || 'laurel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeAward = award.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            link.download = `cratetv_${safeAward}_${safeName}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error("Failed to generate laurel image:", err);
            alert("Could not generate image. Please ensure you are not using an adblocker that blocks canvas operations.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleApplyToPoster = async () => {
        if (!selectedMovie || isApplying) return;
        if (!window.confirm(`This will automatically display this laurel on the poster for "${selectedMovie.title}" across the entire live site. Proceed?`)) return;

        setIsApplying(true);
        try {
            const password = sessionStorage.getItem('adminPassword');
            const updatedMovie = {
                ...selectedMovie,
                awardName: award,
                awardYear: year
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

            if (!response.ok) throw new Error('Failed to update movie data.');
            alert(`Award successfully applied to "${selectedMovie.title}"!`);
        } catch (err) {
            alert(`Failed to apply award: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">Award System</h2>
                <p className="text-gray-400">Manage high-resolution transparent laurels and automatic poster overlays.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Controls */}
                <div className="bg-gray-800/40 p-8 rounded-2xl border border-white/5 space-y-6">
                    <div>
                        <label className="form-label">1. Select Film</label>
                        <select 
                            value={selectedMovieKey} 
                            onChange={(e) => setSelectedMovieKey(e.target.value)}
                            className="form-input"
                        >
                            <option value="">-- Choose a Film --</option>
                            {allMovies.sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                <option key={m.key} value={m.key}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">2. Award Category</label>
                        <select 
                            value={award} 
                            onChange={(e) => setAward(e.target.value)}
                            className="form-input"
                        >
                            {AWARD_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">3. Year</label>
                            <input 
                                type="text" 
                                value={year} 
                                onChange={(e) => setYear(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">4. Style</label>
                            <div className="flex items-center gap-3 mt-2">
                                {[
                                    { name: 'Gold', val: '#FFD700' },
                                    { name: 'Silver', val: '#C0C0C0' },
                                    { name: 'White', val: '#FFFFFF' }
                                ].map(c => (
                                    <button
                                        key={c.name}
                                        onClick={() => setColor(c.val)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.val ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                                        style={{ backgroundColor: c.val }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-3">
                        <button
                            onClick={handleApplyToPoster}
                            disabled={!selectedMovieKey || isApplying}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3"
                        >
                            {isApplying ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                "Apply Laurel to Live Site"
                            )}
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={!selectedMovieKey || isDownloading}
                            className="w-full bg-white/10 hover:bg-white/20 disabled:bg-gray-700 text-white font-black py-4 rounded-xl transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3"
                        >
                            {isDownloading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3"/></svg>
                                    Download High-Res PNG
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center justify-center">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Live Master Preview</h3>
                    <div 
                        ref={laurelRef}
                        className="bg-transparent border-2 border-dashed border-white/10 flex items-center justify-center min-h-[400px] w-full max-w-[600px]"
                        style={{ overflow: 'visible' }}
                    >
                        <LaurelPreview 
                            awardName={award} 
                            year={year} 
                            color={color}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-4 italic text-center">Background remains transparent in the export.</p>
                </div>
            </div>
        </div>
    );
};

export default LaurelManager;
