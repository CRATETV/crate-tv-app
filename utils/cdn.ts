const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com';
const CDN = 'https://d3jhtrl1gnrh4b.cloudfront.net';
export function toCdnUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url.startsWith(S3) ? CDN + url.slice(S3.length) : url;
}
export const CDN_BASE = CDN;
