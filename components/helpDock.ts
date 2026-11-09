// Where the floating Help button should sit. On the live film page it rides above
// the chat box. In the pre-show lobby there is no chat box, so it tucks into the
// bottom corner as a small round button and stops covering the poll and countdown.
import { useSyncExternalStore } from 'react';

let dock: 'default' | 'lobby' = 'default';
const listeners = new Set<() => void>();

export const setHelpDock = (d: 'default' | 'lobby') => {
    if (dock === d) return;
    dock = d;
    listeners.forEach(l => l());
};
export const useHelpDock = () =>
    useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => dock, () => 'default' as const);
