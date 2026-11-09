// "Films to add" checklist (Nov 2026). Before a festival, Salome pastes the
// list of films she still has to put into the catalog. A film ticks itself off
// when the catalog has a film with that exact title; a close-but-not-exact
// match is only suggested (she taps to confirm), so nothing is ever ticked by
// a lucky guess. Reuses the bulk-upload title matcher.

import { matchScore, type FilmChoice } from './filmFileMatch.js';

export const INTAKE_MAX_LINES = 300;
export const INTAKE_FIELD_MAX = 120;

export interface IntakeDraft { title: string; filmmaker: string; festival: string }

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, INTAKE_FIELD_MAX);

/** One film per line. "Title - Filmmaker" (or an en/em dash, a tab or a |) also gives the filmmaker. */
export function parseIntakeLines(text: unknown, festival = ''): IntakeDraft[] {
    const seen = new Set<string>();
    const out: IntakeDraft[] = [];
    for (const raw of String(text ?? '').split(/\r?\n/)) {
        const line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();   // list bullets / numbering
        if (!line) continue;
        const [t, ...rest] = line.split(/\t|\s\|\s|\s[–—-]\s/);
        const title = clean(t);
        if (!title) continue;
        const dupe = title.toLowerCase();
        if (seen.has(dupe)) continue;
        seen.add(dupe);
        out.push({ title, filmmaker: clean(rest.join(' ')), festival: clean(festival) });
        if (out.length >= INTAKE_MAX_LINES) break;
    }
    return out;
}

export type IntakeState =
    | { state: 'done'; via: 'catalog'; film: FilmChoice }
    | { state: 'done'; via: 'manual' }
    | { state: 'maybe'; film: FilmChoice }
    | { state: 'todo' };

interface IntakeItem { title: string; manualDone?: boolean }

export function intakeState(item: IntakeItem, films: FilmChoice[]): IntakeState {
    let best: FilmChoice | null = null, bestScore = 0;
    for (const f of films) {
        const s = matchScore(item.title, f);
        if (s === 100) return { state: 'done', via: 'catalog', film: f };
        if (s > bestScore) { best = f; bestScore = s; }
    }
    if (item.manualDone) return { state: 'done', via: 'manual' };
    // Only a decent partial match is worth suggesting.
    if (best && bestScore >= 60) return { state: 'maybe', film: best };
    return { state: 'todo' };
}
