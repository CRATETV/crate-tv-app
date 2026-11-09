// api/_lib/watchPartyPoll.ts
//
// The pre-show lobby poll: the host asks one question ("Will Marcus tell the
// truth?"), people vote while they wait, and the host reveals the results when
// the film starts. Pure rules here; api/watch-party-poll.ts does the saving.

export interface PartyPoll {
    id: string;
    question: string;
    options: string[];
    status: 'open' | 'closed';
    showResults: boolean;
    results?: number[];
}

export const MAX_OPTIONS = 4;

/** Tidy and check what the host typed. Returns an error in plain words, or the clean poll fields. */
export function cleanPollInput(question: unknown, options: unknown): { ok: true; question: string; options: string[] } | { ok: false; error: string } {
    const q = String(question ?? '').replace(/\s+/g, ' ').trim();
    if (q.length < 3) return { ok: false, error: 'Write the question first (at least a few letters).' };
    if (q.length > 140) return { ok: false, error: 'Keep the question under 140 letters.' };
    const raw = Array.isArray(options) ? options : [];
    const opts = raw.map(o => String(o ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const unique = opts.filter((o, i) => opts.findIndex(x => x.toLowerCase() === o.toLowerCase()) === i);
    if (unique.length < 2) return { ok: false, error: 'Give at least two different answers.' };
    if (unique.length > MAX_OPTIONS) return { ok: false, error: `Use at most ${MAX_OPTIONS} answers.` };
    if (unique.some(o => o.length > 60)) return { ok: false, error: 'Keep each answer under 60 letters.' };
    return { ok: true, question: q, options: unique };
}

/** A vote is allowed only while the poll is open and the answer is one of the options. */
export function voteProblem(poll: Partial<PartyPoll> | null | undefined, optionIndex: unknown): string | null {
    if (!poll || !poll.id || !Array.isArray(poll.options)) return 'There is no poll right now.';
    if (poll.status !== 'open') return 'Voting has closed.';
    if (!Number.isInteger(optionIndex) || (optionIndex as number) < 0 || (optionIndex as number) >= poll.options.length) return 'Pick one of the answers.';
    return null;
}

/** Count votes for this poll only (old polls' votes are ignored). One vote per person is already guaranteed by the vote doc id. */
export function tally(votes: { pollId?: unknown; option?: unknown }[], pollId: string, optionCount: number): number[] {
    const counts = new Array(optionCount).fill(0);
    for (const v of votes) {
        if (v?.pollId !== pollId) continue;
        const o = v.option;
        if (Number.isInteger(o) && (o as number) >= 0 && (o as number) < optionCount) counts[o as number]++;
    }
    return counts;
}

/** Percentages that add to 100 (largest remainder), for the results bars. */
export function percentages(counts: number[]): number[] {
    const total = counts.reduce((s, c) => s + c, 0);
    if (!total) return counts.map(() => 0);
    const raw = counts.map(c => (c / total) * 100);
    const floor = raw.map(Math.floor);
    let left = 100 - floor.reduce((s, c) => s + c, 0);
    const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem);
    for (const { i } of order) { if (left <= 0) break; floor[i]++; left--; }
    return floor;
}
