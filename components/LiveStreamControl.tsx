
import React, { useState } from 'react';
import { Movie } from '../types';

interface LiveStreamControlProps {
    allMovies: Movie[];
    onSave: (movie: Movie) => Promise<void>;
}

const LiveStreamControl: React.FC<LiveStreamControlProps> = ({ allMovies, onSave }) => {
    const [selectedKey, setSelectedKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const movie = allMovies.find(m => m.key === selectedKey);

    const handleUpdate = async (updates: Partial<Movie>) => {
        if (!movie) return;
        setIsSaving(true);
        await onSave({ ...movie, ...updates });
        setIsSaving(false);
        alert("Broadcast Node Updated.");
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-orange-500/20 p-10 rounded-[3rem] shadow-2xl">
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Broadcast Control.</h2>
                    <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">Manage HLS (.m3u8) live relays for specific catalog films.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-1 space-y-6">
                        <label className="text-[10px] font-black uppercase text-orange-500 tracking-[0.4em]">Target Film Node</label>
                        <select 
                            value={selectedKey} 
                            onChange={e => setSelectedKey(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-2xl font-bold focus:outline-none focus:border-orange-600 transition-all"
                        >
                            <option value="">Choose node...</option>
                            {allMovies.map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                        </select>
                    </div>

                    {movie && (
                        <div className="lg:col-span-2 bg-black/40 p-8 rounded-[2rem] border border-white/10 space-y-8 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black uppercase tracking-tighter italic text-white">{movie.title} // RELAY</h3>
                                <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl ${movie.liveStreamStatus === 'live' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                                    {movie.liveStreamStatus || 'OFFLINE'}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-3 block">HLS Endpoint (.m3u8)</label>
                                    <input 
                                        type="text" 
                                        defaultValue={movie.liveStreamUrl} 
                                        onBlur={e => handleUpdate({ liveStreamUrl: e.target.value })}
                                        placeholder="https://your-stream-server.com/live/playlist.m3u8"
                                        className="w-full bg-black/60 border border-white/10 text-white p-4 rounded-xl font-mono text-xs focus:border-orange-600 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleUpdate({ liveStreamStatus: 'live' })}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[9px] shadow-xl"
                                    >
                                        Go Live Immediately
                                    </button>
                                    <button 
                                        onClick={() => handleUpdate({ liveStreamStatus: 'offline' })}
                                        className="bg-white/5 hover:bg-white/10 text-gray-500 font-black py-4 rounded-xl uppercase tracking-widest text-[9px] border border-white/10"
                                    >
                                        Terminate Relay
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveStreamControl;
