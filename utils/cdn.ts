const S3_ORIGINS = [
  'https://cratetelevision.s3.us-east-1.amazonaws.com',
  'https://cratetelevision.s3.amazonaws.com',
];
const CDN_BASE = 'https://d3jhtrl1gnrh4b.cloudfront.net';
export function toCdnUrl(url: string | undefined | null): string {
  if (!url) return '';
  for (const origin of S3_ORIGINS) {
    if (url.startsWith(origin)) return CDN_BASE + url.slice(origin.length);
  }
  return url;
}
export { CDN_BASE };
