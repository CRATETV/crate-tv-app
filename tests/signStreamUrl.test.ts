import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signStreamUrl } from '../api/_lib/signStreamUrl';

const setEnv = () => { Object.assign(process.env, { AWS_S3_BUCKET_NAME: 'cratetelevision', AWS_S3_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'x', AWS_SECRET_ACCESS_KEY: 'y' }); };

test('HLS films come from CloudFront only when HLS_VIA_CLOUDFRONT=1', async () => {
    setEnv();
    process.env.CLOUDFRONT_VIDEO_DOMAIN = 'cdn.example.net';
    process.env.HLS_VIA_CLOUDFRONT = '1';
    const r = await signStreamUrl('https://cratetelevision.s3.us-east-1.amazonaws.com/hsl/my+film/My+Film.m3u8');
    assert.equal(r?.url, 'https://cdn.example.net/hsl/my%20film/My%20Film.m3u8');
});

test('switched off (the default): still a signed storage link', async () => {
    setEnv();
    delete process.env.HLS_VIA_CLOUDFRONT;
    const r = await signStreamUrl('https://cratetelevision.s3.us-east-1.amazonaws.com/hsl/f/F.m3u8');
    assert.ok(r?.url.includes('cratetelevision.s3') && r.url.includes('X-Amz-Signature'));
});

test('plain MP4 is never sent to CloudFront by that switch', async () => {
    setEnv();
    process.env.HLS_VIA_CLOUDFRONT = '1';
    const r = await signStreamUrl('https://cratetelevision.s3.us-east-1.amazonaws.com/films/a.mp4');
    assert.ok(r?.url.includes('X-Amz-Signature'));
    delete process.env.HLS_VIA_CLOUDFRONT;
});
