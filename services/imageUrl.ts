/**
 * imageUrl.ts — Crate Image Optimization Utility
 *
 * Routes image requests through Vercel's built-in Image Optimization API.
 * This automatically:
 *   - Converts images to WebP / AVIF (smaller file size, same quality)
 *   - Resizes to exactly the display width needed (no wasted bytes)
 *   - CDN-caches results globally (fast for all users, everywhere)
 *
 * For canvas operations (SocialKit, shareable images), use /api/proxy-image
 * directly — Vercel's optimizer returns AVIF/WebP which canvas may not support.
 */

type ImageWidth = 256 | 384 | 640 | 750 | 828 | 1080 | 1200;

/**
 * Returns an optimized image URL served through Vercel's Image CDN.
 *
 * @param url     — The original image URL (S3 or other)
 * @param width   — The display width in px. Pick the closest size to what the
 *                  element actually renders at. Vercel serves the right width.
 * @param quality — JPEG/WebP quality 1–100. Default 75 is ideal for posters.
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  width: ImageWidth = 640,
  quality = 75
): string {
  if (!url) return '';

  const trimmed = url.trim();

  // Only route S3 URLs through Vercel Image Optimizer
  // (domain must match vercel.json images.domains)
  if (
    trimmed.includes('.s3.') ||
    trimmed.includes('.amazonaws.com')
  ) {
    return `/_vercel/image?url=${encodeURIComponent(trimmed)}&w=${width}&q=${quality}`;
  }

  // Non-S3 URLs fall back to the existing proxy (handles CORS, encoding, etc.)
  return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Convenience presets — use these instead of raw getOptimizedImageUrl calls
 * so widths stay consistent across the app.
 */

/** Small card thumbnail — grid layouts, carousels */
export const cardImage = (url: string | undefined | null) =>
  getOptimizedImageUrl(url, 384, 75);

/** Hero / featured film — large above-the-fold image */
export const heroImage = (url: string | undefined | null) =>
  getOptimizedImageUrl(url, 828, 80);

/** Modal / detail view — medium–large */
export const modalImage = (url: string | undefined | null) =>
  getOptimizedImageUrl(url, 640, 80);

/** Small avatar / actor photo */
export const avatarImage = (url: string | undefined | null) =>
  getOptimizedImageUrl(url, 256, 75);

/** Festival page hero */
export const festivalHeroImage = (url: string | undefined | null) =>
  getOptimizedImageUrl(url, 1080, 85);
