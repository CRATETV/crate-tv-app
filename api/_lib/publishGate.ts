/**
 * Decides whether a submission may be approved / added to the catalog, based on the
 * virus-scan result recorded on it (`security.scan`):
 *
 *   not_configured / missing  no scanner deployed yet — not blocked (older entries, or scanning is off)
 *   pending                   scanner hasn't reported — blocked until it does
 *   clean                     fine
 *   infected / error          blocked
 *
 * Returns the reason to show the admin, or null if it's fine to proceed.
 */
export const publishBlockReason = (entry: Record<string, any> | undefined): string | null => {
    switch (entry?.security?.scan) {
        case 'infected': return 'This submission was flagged by the virus scan and cannot be approved. Reject it instead.';
        case 'pending': return 'This submission is still being virus-scanned. Try again in a few minutes.';
        case 'error': return 'The virus scan could not complete for this submission, so it cannot be approved. Reject it or ask the filmmaker to resubmit.';
        default: return null;
    }
};
