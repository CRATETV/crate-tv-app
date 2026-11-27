// api/_lib/mailBadge.ts
//
// The number on the Email tab in the sidebar. A help request counts until you reply
// (Waiting), mark it Solved, or delete it. Deleted ones are only HIDDEN from your inbox,
// so the count has to skip hidden ones too, otherwise the badge lights up again after you
// leave the tab even though your inbox looks empty.

/** How many help requests still need you: no status set, and not removed from your inbox. */
export function countOpenHelp(helpIds: string[], statusIds: Iterable<string>, hiddenIds: Iterable<string>): number {
    const done = new Set<string>([...statusIds, ...hiddenIds]);
    return helpIds.filter(id => !done.has(`help_${id}`)).length;
}
