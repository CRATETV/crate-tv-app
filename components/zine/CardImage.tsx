import React, { useEffect, useRef, useState } from 'react';
import { zineImg } from './ZineArticleBody';

/** A story picture that fills its box, unless it is a tall poster: then it is shown whole and centred over a soft, blurred copy of itself, so nothing is cut off. */
const CardImage: React.FC<{ src: string; width: number; lazy?: boolean; zoom: string }> = ({ src, width, lazy, zoom }) => {
    const [tall, setTall] = useState(false);
    const ref = useRef<HTMLImageElement>(null);
    const url = zineImg(src, width);
    const check = (i: HTMLImageElement | null) => { if (i && i.naturalWidth) setTall(i.naturalHeight > i.naturalWidth * 1.05); };
    useEffect(() => { check(ref.current); }, [url]);
    return (
        <>
            {tall && <img src={url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-50" />}
            <img ref={ref} src={url} alt="" {...(lazy ? { loading: 'lazy' as const, decoding: 'async' as const } : {})} onLoad={e => check(e.currentTarget)}
                className={`relative w-full h-full ${tall ? 'object-contain' : 'object-cover'} transition-transform ${zoom}`} />
        </>
    );
};

export default CardImage;
