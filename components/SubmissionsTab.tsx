import React, { useCallback, useEffect, useState } from 'react';
import { MoviePipelineEntry, ActorSubmission } from '../types';
import { MoviePipelineTab, isNewSubmission } from './MoviePipelineTab';
import { ActorSubmissionsTab } from './ActorSubmissionsTab';

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS — one place to review everything people send to Crate.
//
//   Films          → MoviePipelineTab (the Sept 20 rebuild: NEW badges,
//                    mark-as-seen, inline player, filters, search).
//   Actor Profiles → ActorSubmissionsTab. This review screen existed but was
//                    never mounted anywhere, so actor signups were stuck even
//                    though their notification email said "Review in Admin".
// ─────────────────────────────────────────────────────────────────────────────

interface SubmissionsTabProps {
    pipeline: MoviePipelineEntry[];
    onCreateMovie: (item: MoviePipelineEntry) => void;
    onRefresh: () => void;
    onViewed: (id: string) => void;
    onMarkAllViewed: () => void;
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = (props) => {
    const [view, setView] = useState<'films' | 'actors'>('films');
    const [actorSubs, setActorSubs] = useState<ActorSubmission[]>([]);
    const [actorError, setActorError] = useState('');

    const loadActors = useCallback(async () => {
        setActorError('');
        try {
            const res = await fetch('/api/get-actor-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: sessionStorage.getItem('adminPassword') }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not load actor submissions.');
            setActorSubs(data.submissions || []);
        } catch (e) {
            setActorError(e instanceof Error ? e.message : 'Could not load actor submissions.');
        }
    }, []);
    useEffect(() => { loadActors(); }, [loadActors]);

    const newFilms = props.pipeline.filter(isNewSubmission).length;
    const pendingActors = actorSubs.filter(s => s.status === 'pending').length;

    const tabBtn = (id: 'films' | 'actors', label: string, count: number) => (
        <button
            onClick={() => setView(id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === id ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
        >
            {label}
            {count > 0 && <span className="ml-2 bg-white/20 rounded-full px-2">{count}</span>}
        </button>
    );

    return (
        <div className="space-y-8">
            <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl w-max">
                {tabBtn('films', '🎞 Films', newFilms)}
                {tabBtn('actors', '🎭 Actor Profiles', pendingActors)}
            </div>

            {view === 'films' && <MoviePipelineTab {...props} />}

            {view === 'actors' && (
                actorError
                    ? <p className="text-red-400 text-sm">{actorError}</p>
                    : <ActorSubmissionsTab submissions={actorSubs} onRefresh={loadActors} />
            )}
        </div>
    );
};

export default SubmissionsTab;
