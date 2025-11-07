// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-roku-zip

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

// Helper to recursively read a directory
async function readDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        const res = path.resolve(dirPath, entry.name);
        return entry.isDirectory() ? readDirectory(res) : res;
    }));
    return files.flat();
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
        isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const files = await readDirectory(rokuDir);

    const zip = new JSZip();

    // Add all files from the local /roku directory to the zip
    for (const file of files) {
        const content = await fs.readFile(file);
        const zipPath = path.relative(rokuDir, file);
        zip.file(zipPath, content);
    }
    
    // Create the manifest file dynamically
    zip.file('manifest', `
title=Crate TV
major_version=1
minor_version=1
build_version=0
mm_icon_focus_hd=pkg:/images/logo_hd.png
mm_icon_side_hd=pkg:/images/logo_hd.png
splash_screen_hd=pkg:/images/splash_hd.png
`.trim());

    // Fetch and add the required Roku images from S3
    const logoUrl = 'https://cratetelevision.s3.us-east-1.amazonaws.com/roku-assets/logo_hd.png';
    const splashUrl = 'https://cratetelevision.s3.us-east-1.amazonaws.com/roku-assets/splash_hd.png';

    const [logoResponse, splashResponse] = await Promise.all([
        fetch(logoUrl),
        fetch(splashUrl)
    ]);

    if (!logoResponse.ok || !splashResponse.ok) {
        throw new Error('Failed to fetch required Roku channel images from asset storage.');
    }

    const [logoBuffer, splashBuffer] = await Promise.all([
        logoResponse.arrayBuffer(),
        splashResponse.arrayBuffer()
    ]);

    zip.file('images/logo_hd.png', logoBuffer);
    zip.file('images/splash_hd.png', splashBuffer);

    // Generate the final zip file as a standard ArrayBuffer
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Return the zip file to the client
    return new Response(zipBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="cratetv-roku-channel.zip"',
        },
    });

  } catch (error) {
    console.error("Error generating Roku ZIP:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}