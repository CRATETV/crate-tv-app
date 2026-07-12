import { useEffect } from 'react';

// Secret keyboard shortcut: typing "adm" anywhere on the site (while no
// input/textarea/contentEditable field is focused, and with no modifier
// keys held) navigates to /admin — so admins don't have to remember or
// type the URL by hand.
//
// This does NOT replace or weaken the /admin route's own login screen
// (see AdminPage.tsx) — it's just a faster way to get to that door. Anyone
// who reaches /admin, whether by typing "adm" or the URL directly, still
// has to authenticate.
//
// To disable the shortcut entirely (e.g. ahead of a public launch) without
// touching routing, flip this flag to false.
export const ADMIN_SHORTCUT_ENABLED = true;

const ADMIN_SEQUENCE = ['a', 'd', 'm'];

/**
 * Call once, near the root of the app (see index.tsx), so the shortcut
 * works from any page.
 */
export function useAdminKeyboardShortcut(): void {
  useEffect(() => {
    if (!ADMIN_SHORTCUT_ENABLED) return;

    let buffer: string[] = [];

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTypingIntoField =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        !!target?.isContentEditable;

      // Ignore while the user is typing into a field, or holding a modifier
      // (so browser/OS shortcuts like Cmd+A aren't swallowed or misread).
      if (isTypingIntoField || e.metaKey || e.ctrlKey || e.altKey) {
        buffer = [];
        return;
      }

      const key = e.key.toLowerCase();
      if (key.length !== 1 || key < 'a' || key > 'z') {
        buffer = [];
        return;
      }

      buffer.push(key);
      if (buffer.length > ADMIN_SEQUENCE.length) {
        buffer = buffer.slice(-ADMIN_SEQUENCE.length);
      }

      if (buffer.join('') === ADMIN_SEQUENCE.join('')) {
        buffer = [];
        if (window.location.pathname !== '/admin') {
          window.history.pushState({}, '', '/admin');
          window.dispatchEvent(new Event('pushstate'));
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
