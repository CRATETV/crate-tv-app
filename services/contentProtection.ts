// Light "keep honest people honest" protection for the public site (Oct 30 2026).
// Blocks copy / cut, text selection, right-click / long-press menus and picture
// dragging. It does NOT stop screenshots or screen recording: no website can.
// (Netflix stops those with DRM, a locked video format the phone itself enforces.)
// Left alone: typing boxes, anything marked data-allow-copy (invite codes, links),
// and the admin area (someone signed in with the admin password).

const isAdminSession = (): boolean => {
    try { return !!sessionStorage.getItem('adminPassword'); } catch { return false; }
};

/** True when this event should be left alone. Pure enough to test. */
export function isProtectionExempt(target: EventTarget | null, admin: boolean): boolean {
    if (admin) return true;
    const el = target as Element | null;
    if (!el || typeof (el as any).closest !== 'function') return false;
    return !!el.closest('input, textarea, select, [contenteditable="true"], [data-allow-copy]');
}

export function installContentProtection(): void {
    if (typeof document === 'undefined' || (window as any).__crateProtection) return;
    (window as any).__crateProtection = true;
    const block = (e: Event) => { if (!isProtectionExempt(e.target, isAdminSession())) e.preventDefault(); };
    for (const type of ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart']) {
        document.addEventListener(type, block);
    }
    const style = document.createElement('style');
    style.textContent = `
        body:not([data-admin]) { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        body:not([data-admin]) input, body:not([data-admin]) textarea, body:not([data-admin]) [data-allow-copy] { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
        img, video { -webkit-user-drag: none; -webkit-touch-callout: none; }`;
    document.head.appendChild(style);
}
