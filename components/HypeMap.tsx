import React from 'react';
import { SentimentPoint } from '../types';

interface HypeMapProps {
    sentiment: SentimentPoint[];
    duration: number;
}

const HypeMap: React.FC<HypeMapProps> = ({ sentiment, duration }) => {
    if (!sentiment || sentiment.length === 0) return (
        <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-xl">
            <p className="text-[10px] text-gray-700 uppercase font-black tracking-widest">No sentiment data logged yet</p>
        </div>
    );

    const bucketSize = 30; // 30s chunks
    const numBuckets = Math.ceil(duration / bucketSize);
    const buckets = Array(numBuckets).fill(0);

    sentiment.forEach(p => {
        const index = Math.floor(p.timestamp / bucketSize);
        if (index < numBuckets) buckets[index]++;
    });

    const maxHype = Math.max(...buckets, 1);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end h-24 gap-0.5">
                {buckets.map((count, i) => (
                    <div 
                        key={i} 
                        className="flex-grow bg-red-600/30 hover:bg-red-500 rounded-sm transition-all group relative"
                        style={{ height: `${(count / maxHype) * 100}%` }}
                    >
                         {count > (maxHype * 0.75) && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-[8px] font-black px-1 rounded">PEAK</div>
                         )}
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                <span>00:00</span>
                <span>Engagement Intensity Timeline</span>
                <span>{Math.floor(duration/60)}:00</span>
            </div>
        </div>
    );
};

export default HypeMap;