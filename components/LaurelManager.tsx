import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';
import JSZip from 'jszip';

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
    const [isKitGenerating, setIsKitGenerating] = useState(false);
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

    const renderToPng = async (svgElement: SVGSVGElement, fillColor: string): Promise<string> => {
        const size = 3000;
        const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
        clonedSvg.setAttribute('width', size.toString());
        clonedSvg.setAttribute('height', size.toString());
        
        // Update all paths/texts to the target color
        const elements = clonedSvg.querySelectorAll('path, text');
        elements.forEach(el => {
            if (el.tagName === 'path') el.setAttribute('fill', fillColor);
            if (el.tagName === 'text') el.setAttribute('fill', fillColor);
        });

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");

        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                const pngUrl = canvas.toDataURL('image/png', 1.0);
                URL.revokeObjectURL(url);
                resolve(pngUrl.split(',')[1]); // Return base64 part
            };
            img.src = url;
        });
    };

    const handleDownloadSingle = async () => {
        if (!laurelRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const sourceSvg = laurelRef.current.querySelector('svg');
            if (!sourceSvg) throw new Error("SVG element not found");
            
            const base64 = await renderToPng(sourceSvg, color);
            const link = document.createElement('a');
            link.download = `Crate_Laurel_${award.replace(/\s/g, '_')}_${year}.png`;
            link.href = `data:image/png;base64,${base64}`;
            link.click();
        } catch (err) {
            alert("Download failed.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleExportKit = async () => {
        if (!laurelRef.current || isKitGenerating) return;
        setIsKitGenerating(true);
        const zip = new JSZip();
        
        try {
            const sourceSvg = laurelRef.current.querySelector('svg');
            if (!sourceSvg) throw new Error("SVG element not found");

            const variations = [
                { name: 'Gold', hex: '#FFD700' },
                { name: 'White', hex: '#FFFFFF' },
                { name: 'Black', hex: '#000000' }
            ];

            for (const v of variations) {
                const b64 = await renderToPng(sourceSvg, v.hex);
                zip.file(`Laurel_Accreditation_${v.name}.png`, b64, { base64: true });
            }

            const readme = `
CRATE TV: OFFICIAL LAUREL ACCREDITATION KIT
------------------------------------------
Film: ${selectedMovie?.title || 'Untitled'}
Award: ${award}
Year: ${year}

USAGE GUIDELINES:
- GOLD: Use for primary posters and high-end marketing materials.
- WHITE: Optimized for dark background social media tiles and trailers.
- BLACK: Optimized for light background printed press releases.

Accreditation provided by Crate TV Studio V4.
            `.trim();
            zip.file('README_Usage_Guidelines.txt', readme);

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CrateTV_LaurelKit_${(selectedMovie?.title || 'Film').replace(/\s/g, '_')}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Kit generation failed.");
        } finally {
            setIsKitGenerating(false);
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
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-6 block">01. Select Catalog Film</label>
                            <select 
                                value={selectedMovieKey} 
                                onChange={(e) => setSelectedMovieKey(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl font-bold focus:outline-none focus:border-red-600 transition-all"
                            >
                                <option value="">Choose a movie...</option>
                                {allMovies.sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                    <option key={m.key} value={m.key}>{m.title}</option>
                                ))}
                            </select>
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
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleDownloadSingle}
                                        disabled={isDownloading}
                                        className="flex-grow bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : 'Download PNG'}
                                    </button>
                                    <button 
                                        onClick={handleExportKit}
                                        disabled={isKitGenerating}
                                        className="flex-grow bg-indigo-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isKitGenerating ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Export Full Kit (.zip)'}
                                    </button>
                                </div>
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
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">Live Proofing Core</p>
                        </div>
                        
                        <div className="w-full aspect-square bg-black rounded-[60px] border border-white/5 flex items-center justify-center overflow-hidden shadow-[inset_0_0_200px_rgba(0,0,0,1)] relative">
                            <div ref={laurelRef} className="w-full h-full p-8 md:p-12">
                                <LaurelPreview awardName={award} year={year} color={color} />
                            </div>
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                {PRESET_FINISHES.map(f => (
                                    <button 
                                        key={f.val}
                                        onClick={() => setColor(f.val)}
                                        className={`w-4 h-4 rounded-full border border-white/20 transition-transform ${color === f.val ? 'scale-150 ring-2 ring-red-500/50' : 'hover:scale-125'}`}
                                        style={{ backgroundColor: f.val }}
                                    />
                                ))}
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