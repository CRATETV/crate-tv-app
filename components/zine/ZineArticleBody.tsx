import React from 'react';
import { ZineSection, Movie } from '../../types';

// How The Unpack draws the body of a story. The public story page and the
// editor's live preview both use this, so what you see while writing is what
// readers get.

export const zineImg = (url: string, width = 1200) =>
    url ? `/api/proxy-image?url=${encodeURIComponent(url)}&w=${width}` : '';

export const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

const paragraphs = (text: string) => (text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

interface Props {
    sections: ZineSection[];
    movies?: Record<string, Movie>;
    /** Editor preview: links do nothing. */
    preview?: boolean;
    onOpenFilm?: (key: string) => void;
}

const Caption: React.FC<{ caption?: string; credit?: string }> = ({ caption, credit }) =>
    (caption || credit) ? (
        <figcaption className="mt-3 text-[13px] leading-snug text-zinc-500">
            {caption}{caption && credit ? ' ' : ''}{credit && <span className="uppercase tracking-wider text-[10px] font-bold text-zinc-400">Photo: {credit}</span>}
        </figcaption>
    ) : null;

const ZineArticleBody: React.FC<Props> = ({ sections, movies, preview, onOpenFilm }) => {
    const firstTextId = sections.find(s => s.type === 'text' && s.content.trim())?.id;

    return (
        <div className="zine-body space-y-9 md:space-y-11">
            {sections.map(section => {
                const c = section.content || '';
                switch (section.type) {
                    case 'header':
                        return <h2 key={section.id} style={{ fontFamily: SERIF }} className="text-[1.9rem] md:text-[2.4rem] font-bold leading-[1.1] text-zinc-900 pt-4">{c}</h2>;

                    case 'quote':
                        return (
                            <blockquote key={section.id} className="my-4 md:my-6 py-8 border-y-2 border-zinc-900 text-center">
                                <p style={{ fontFamily: SERIF }} className="text-[1.7rem] md:text-[2.3rem] italic leading-[1.2] text-zinc-900 max-w-xl mx-auto">“{c}”</p>
                            </blockquote>
                        );

                    case 'callout':
                        return (
                            <aside key={section.id} className="bg-amber-50 border-l-4 border-red-600 rounded-r-2xl px-6 md:px-8 py-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-600 mb-3">{section.label || 'A note'}</p>
                                {paragraphs(c).map((p, i) => <p key={i} style={{ fontFamily: SERIF }} className="text-lg md:text-xl italic leading-relaxed text-zinc-800 mb-3 last:mb-0">{p}</p>)}
                            </aside>
                        );

                    case 'image':
                        return c ? (
                            <figure key={section.id} className="-mx-2 md:-mx-12">
                                <img src={zineImg(c, 1400)} alt={section.caption || ''} loading="lazy" decoding="async" className="w-full h-auto rounded-sm" />
                                <Caption caption={section.caption} credit={section.credit} />
                            </figure>
                        ) : null;

                    case 'gallery': {
                        const urls = c.split('\n').map(u => u.trim()).filter(u => /^https?:\/\//.test(u));
                        if (!urls.length) return null;
                        const cols = urls.length === 1 ? 'grid-cols-1' : urls.length === 2 || urls.length === 4 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
                        return (
                            <figure key={section.id} className="-mx-2 md:-mx-12">
                                <div className={`grid ${cols} gap-2 md:gap-3`}>
                                    {urls.map((u, i) => <img key={i} src={zineImg(u, urls.length === 1 ? 1400 : 800)} alt="" loading="lazy" decoding="async" className={`w-full object-cover rounded-sm ${urls.length === 1 ? 'h-auto' : 'aspect-[4/3]'}`} />)}
                                </div>
                                <Caption caption={section.caption} credit={section.credit} />
                            </figure>
                        );
                    }

                    case 'video':
                        return c ? <div key={section.id} className="aspect-video bg-black rounded-sm overflow-hidden"><video src={c} controls playsInline className="w-full h-full object-cover" /></div> : null;

                    case 'film': {
                        const m = movies?.[c];
                        if (!m) return preview ? <div key={section.id} className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">Film card: pick a film</div> : null;
                        return (
                            <div key={section.id} className="flex gap-5 md:gap-7 items-center bg-zinc-900 text-white rounded-2xl p-4 md:p-6">
                                <img src={zineImg(m.poster, 400)} alt="" loading="lazy" className="w-24 md:w-32 aspect-[2/3] object-cover rounded-lg flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 mb-1">Watch on Crate TV</p>
                                    <p style={{ fontFamily: SERIF }} className="text-2xl md:text-3xl font-bold leading-tight">{m.title}</p>
                                    {m.director && <p className="text-sm text-zinc-400 mt-1">Directed by {m.director}</p>}
                                    <button type="button" onClick={() => !preview && onOpenFilm?.(c)} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full">▶ Watch now</button>
                                </div>
                            </div>
                        );
                    }

                    default: {
                        const paras = paragraphs(c);
                        return (
                            <div key={section.id} className="space-y-6">
                                {paras.map((p, i) => {
                                    const dropCap = section.id === firstTextId && i === 0 && p.length > 40;
                                    return (
                                        <p key={i} style={{ fontFamily: SERIF }} className="text-[1.15rem] md:text-[1.3rem] leading-[1.75] text-zinc-800">
                                            {dropCap ? (
                                                <>
                                                    <span className="float-left text-[5.2rem] leading-[0.8] font-bold text-red-600 pr-3 pt-2" style={{ fontFamily: SERIF }}>{p.charAt(0)}</span>
                                                    {p.slice(1)}
                                                </>
                                            ) : p}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    }
                }
            })}
        </div>
    );
};

export default ZineArticleBody;
