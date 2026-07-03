// Tracks whether the user has interacted with the page AT ALL — anywhere,
// at any point since load — not scoped to any one component's lifetime.
//
// Why this exists: browsers only allow unmuted audio/video playback after
// some form of real user gesture. The watch party video used to handle
// this by starting muted and showing a small "Tap to Unmute" button —
// meaning it depended on the viewer noticing and tapping that *exact*
// button at that *exact* moment. In practice, by the time someone is
// actually watching the video, they've already tapped through several
// screens to get there (opening the site, logging in, entering the
// lobby...). Once a genuine gesture has happened ANYWHERE on the page,
// that's enough to satisfy the browser — there's no need to make them do
// it again on a specific tiny button, and that unnecessary extra step was
// exactly what was leaving the video looking "stuck" (silently muted with
// no obvious next step) until someone thought to reload the page.
type Listener = () => void;

let interacted = false;
const listeners = new Set<Listener>();

const markInteracted = () => {
    if (interacted) return;
    interacted = true;
    listeners.forEach(l => l());
    listeners.clear();
    teardown();
};

let teardown: () => void = () => {};

if (typeof document !== 'undefined') {
    const opts: AddEventListenerOptions = { capture: true };
    document.addEventListener('pointerdown', markInteracted, opts);
    document.addEventListener('touchstart', markInteracted, opts);
    document.addEventListener('keydown', markInteracted, opts);
    teardown = () => {
        document.removeEventListener('pointerdown', markInteracted, opts);
        document.removeEventListener('touchstart', markInteracted, opts);
        document.removeEventListener('keydown', markInteracted, opts);
    };
}

/** True if the user has interacted with the page at any point this session. */
export const hasUserGestured = (): boolean => interacted;

/**
 * Runs `callback` the moment the user's first interaction happens. If it
 * already happened, runs immediately. Returns an unsubscribe function.
 */
export const onFirstUserGesture = (callback: Listener): (() => void) => {
    if (interacted) {
        callback();
        return () => {};
    }
    listeners.add(callback);
    return () => { listeners.delete(callback); };
};
