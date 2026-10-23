import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { GET, detectImageType, clampWidth } from '../api/proxy-image';

const S3 = 'https://cratetelevision.s3.us-east-1.amazonaws.com/';

async function bigPoster(format: 'png' | 'jpeg') {
    const img = sharp({ create: { width: 3000, height: 4500, channels: 3, background: '#7a2030' } });
    return new Uint8Array(await (format === 'png' ? img.png() : img.jpeg()).toBuffer());
}

function withFakeS3(bytes: Uint8Array, contentType: string | null, run: () => Promise<void>) {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response(bytes as unknown as BodyInit, { status: 200, headers: contentType ? { 'Content-Type': contentType } : {} })) as typeof fetch;
    return run().finally(() => { globalThis.fetch = real; });
}

test('a huge poster is shrunk to the asked width and sent as WebP', async () => {
    await withFakeS3(await bigPoster('png'), 'image/png', async () => {
        const res = await GET(new Request(`https://x/api/proxy-image?url=${encodeURIComponent(S3 + 'Big+poster.png')}&w=500`, { headers: { accept: 'image/webp,*/*' } }));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('Content-Type'), 'image/webp');
        const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
        assert.equal(meta.width, 500);
        assert.equal(meta.height, 750);
    });
});

test('browsers without WebP get a JPEG', async () => {
    await withFakeS3(await bigPoster('jpeg'), 'image/jpeg', async () => {
        const res = await GET(new Request(`https://x/api/proxy-image?url=${encodeURIComponent(S3 + 'a.jpg')}`, { headers: { accept: 'image/png,*/*' } }));
        assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
        assert.equal((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width, 1000);
    });
});

test('a poster stored with a vague type and no file extension still works', async () => {
    await withFakeS3(await bigPoster('jpeg'), 'binary/octet-stream', async () => {
        const res = await GET(new Request(`https://x/api/proxy-image?url=${encodeURIComponent(S3 + "it's+in+you+poster+jpeg")}&w=400`, { headers: { accept: 'image/webp' } }));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('Content-Type'), 'image/webp');
    });
});

test('SVG posters pass through untouched with the right type', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await withFakeS3(svg, 'binary/octet-stream', async () => {
        const res = await GET(new Request(`https://x/api/proxy-image?url=${encodeURIComponent(S3 + 'posters/desmonds.svg')}`, { headers: { accept: 'image/webp' } }));
        assert.equal(res.headers.get('Content-Type'), 'image/svg+xml');
        assert.deepEqual(new Uint8Array(await res.arrayBuffer()), svg);
    });
});

test('non-S3 addresses are still refused', async () => {
    const res = await GET(new Request(`https://x/api/proxy-image?url=${encodeURIComponent('https://evil.example/x.png')}`));
    assert.equal(res.status, 400);
});

test('width is kept within limits', () => {
    assert.equal(clampWidth(null), 1000);
    assert.equal(clampWidth('5'), 100);
    assert.equal(clampWidth('99999'), 2000);
    assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'x', null), 'image/png');
});
