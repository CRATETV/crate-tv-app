import React, { useEffect, useState } from 'react';

// A poster that never shows a broken-picture icon. It tries, in order:
//   1. the shrunk copy from our image proxy (fast, small)
//   2. the original file, with spaces in the link fixed
//   3. a plain tile with the film's title
// The film cards on the home page already did this; the "Access Locked" screen
// and a few other pages used the raw link, so one bad link showed a broken icon.
interface SafePosterProps {
    src?: string;
    title: string;
    className?: string;
    width?: number;
}

const SafePoster: React.FC<SafePosterProps> = ({ src, title, className = '', width = 500 }) => {
    const [attempt, setAttempt] = useState(0);
    useEffect(() => { setAttempt(0); }, [src]);

    if (!src || attempt >= 2) {
        return (
            <div className={`flex items-end bg-gradient-to-br from-zinc-800 to-black p-3 ${className}`} role="img" aria-label={title}>
                <span className="text-white font-black uppercase tracking-tight text-sm leading-tight line-clamp-3">{title}</span>
            </div>
        );
    }
    return (
        <img
            key={`${src}-${attempt}`}
            src={attempt === 0 ? `/api/proxy-image?url=${encodeURIComponent(src)}&w=${width}` : src.trim().replace(/\s/g, '%20')}
            alt={title}
            className={className}
            loading="lazy"
            decoding="async"
            onError={() => setAttempt(a => a + 1)}
        />
    );
};

export default SafePoster;
