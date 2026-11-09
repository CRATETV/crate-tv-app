// Which films the Catalog Integrity Audit shows by default: the ones doing best,
// plus ANY film whose video is missing. The audit exists to catch broken films,
// so a broken one must never hide just because nobody has watched it yet.

export const AUDIT_TOP_N = 3;

interface Row { views: number; hasStream: boolean }

/** Rows must already be sorted best first. */
export function auditDefaultView<T extends Row>(sorted: T[], topN: number = AUDIT_TOP_N): { shown: T[]; hidden: number; broken: number } {
    const top = new Set(sorted.slice(0, topN));
    const shown = sorted.filter(r => top.has(r) || !r.hasStream);
    const broken = sorted.filter(r => !r.hasStream && !top.has(r)).length;
    return { shown, hidden: sorted.length - shown.length, broken };
}
