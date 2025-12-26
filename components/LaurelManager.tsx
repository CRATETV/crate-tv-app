import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';

interface LaurelManagerProps {
    allMovies: Movie[];
}

const PRESET_CATEGORIES = [
    "Official Selection", 
    "Grand Jury Prize", 
    "Best Performance", 
    "Best Documentary Short", 
    "Best Animation Selection", 
    "Best Student Film",
    "Best Director", 
    "Best Screenplay"
];

const PRESET_FINISHES = [
    { name: 'White', val: '#FFFFFF' },
    { name: 'Gold', val: '#FFD700' },
    { name: 'Silver', val: '#C0C0C0' },
    { name: 'Rose Gold', val: '#B76E79' },
    { name: 'Black', val: '#000000' },
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

    useEffect(() => {
        if (selectedMovie) {
            if (selectedMovie.awardName) setAward(selectedMovie.awardName);
            if (selectedMovie.awardYear) setYear(selectedMovie.awardYear);
        }
    }, [selectedMovie]);

    const handleDownload = async () => {
        if (!laurelRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const sourceSvg = laurelRef.current.querySelector('svg');
            if (!sourceSvg) throw new Error("SVG element not found");
            
            const svgElement = sourceSvg.cloneNode(true) as SVGSVGElement;
            const size = 3000;
            svgElement.setAttribute('width', size.toString());
            svgElement.setAttribute('height', size.toString());
            
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not init canvas context");

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                const pngUrl = canvas.toDataURL('image/png', 1.0);
                const downloadLink = document.createElement('a');
                downloadLink.download = `Crate_Laurel_${award.replace(/\s/g, '_')}_${year}.png`;
                downloadLink.href = pngUrl;
                downloadLink.click();
                URL.revokeObjectURL(url);
                setIsDownloading(false);
            };
            img.src = url;
        } catch (err) {
            setIsDownloading(false);
            alert("Download failed.");
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
                awardYear: year
            };
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type: 'movies', data: { [selectedMovie.key]: updatedMovie } }),
            });
            if (!response.ok) throw new Error('Update failed.');
            alert(`Laurel metadata synced to "${selectedMovie.title}".`);
        } catch (err) {
            alert("Error syncing data.");
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center">
                <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-4">Elite Aesthetic Core</p>
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 text-white">Studio V4</h1>
                <p className="text-gray-500 font-medium max-w-lg mx-auto">High-density lean architecture: 20 needle-petals per side with 145-unit expansive clearance.</p>
            </div>

            <div className="bg-[#0f0f0f]/95 backdrop-blur-[40px] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-[0_60px_150px_rgba(0,0,0,1)] max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
                    <div className="lg:col-span-2 flex flex-col gap-10">
                        <section>
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-8 block">01. Premium Finish</label>
                            <div className="flex gap-6 flex-wrap">
                                {PRESET_FINISHES.map(f => (
                                    <button
                                        key={f.val}
                                        onClick={() => setColor(f.val)}
                                        className={`w-12 h-12 rounded-full border-2 transition-all transform active:scale-90 ${color === f.val ? 'border-red-600 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                        style={{ backgroundColor: f.val }}
                                        title={f.name}
                                    />
                                ))}
                            </div>
                        </section>

                        <section>
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-8 block">02. Accreditation Editor</label>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    value={award} 
                                    onChange={(e) => setAward(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl font-black text-center text-lg tracking-tight focus:outline-none focus:border-red-600 transition-all"
                                    placeholder="Type custom award..."
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {PRESET_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setAward(cat)}
                                            className={`py-3 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${award === cat ? 'bg-white text-black border-white scale-[1.03] shadow-lg' : 'bg-white/5 text-gray-600 border-white/5 hover:text-gray-300'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="flex flex-col gap-6 pt-8 border-t border-white/5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 block mb-4">03. Production Year</label>
                                <input 
                                    type="text" 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl font-black text-center text-2xl tracking-widest focus:outline-none focus:border-red-600 transition-all"
                                    maxLength={4}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <button 
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isDownloading ? (
                                        <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    )}
                                    Export 3000px PNG
                                </button>
                                <button 
                                    onClick={handleApplyToPoster} 
                                    disabled={!selectedMovieKey || isApplying} 
                                    className="bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all disabled:bg-gray-800 disabled:text-gray-600 active:scale-95"
                                >
                                    {isApplying ? 'Syncing...' : 'Sync to Movie Metadata'}
                                </button>
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-3 flex flex-col items-center">
                        <div className="mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">Lean Geometry v4.0</p>
                        </div>
                        
                        <div className="w-full aspect-square bg-black rounded-[60px] border border-white/5 flex items-center justify-center overflow-hidden shadow-[inset_0_0_200px_rgba(0,0,0,1)] relative">
                            <div ref={laurelRef} className="w-full h-full p-8 md:p-12">
                                <LaurelPreview awardName={award} year={year} color={color} />
                            </div>
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">Live Proof</p>
                            </div>
                        </div>
                        <p className="mt-8 text-[10px] font-black text-gray-800 uppercase tracking-[1em] mr-[-1em]">CRATE SOPHISTICATION STANDARDS</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaurelManager;