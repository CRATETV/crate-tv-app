// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-roku-zip

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
// FIX: Import Buffer to handle binary data types, as Node.js globals are not fully typed in this environment.
import { Buffer } from 'buffer';

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

    // FIX: Cast `process` to `any` to access `cwd()`. The TypeScript environment for Vercel functions
    // in this project seems to have incomplete Node.js types, causing `process.cwd()` to be unrecognized.
    // This cast resolves the type error; the code is correct at runtime.
    const rokuDir = path.join((process as any).cwd(), 'roku');
    const zip = new JSZip();

    // Read all files from the roku directory
    const allFilePaths = await readDirectory(rokuDir);
    
    // The base URL of the deployment
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const feedUrl = `${protocol}://${host}/api/roku-feed`;

    for (const filePath of allFilePaths) {
      // Get the relative path inside the 'roku' directory to use for the zip entry
      const relativePath = path.relative(rokuDir, filePath);
      
      // Exclude macOS-specific metadata files
      if (path.basename(relativePath) === '.DS_Store') {
        continue;
      }

      let fileContent: Buffer | string = await fs.readFile(filePath);

      // Specifically find and replace the placeholder in HomeScene.brs
      if (relativePath.replace(/\\/g, '/') === 'components/HomeScene.brs') {
        fileContent = fileContent.toString('utf-8').replace(/m\.contentTask\.url\s*=\s*".*"/, `m.contentTask.url = "${feedUrl}"`);
      }
      
      zip.file(relativePath, fileContent);
    }

    // --- Dynamically add manifest and required images ---
    const logoUrl = "https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png";
    const splashUrl = "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG";

    const [logoResponse, splashResponse] = await Promise.all([
        fetch(logoUrl),
        fetch(splashUrl)
    ]);

    if (!logoResponse.ok || !splashResponse.ok) {
        throw new Error("Failed to fetch required Roku images from S3.");
    }

    const logoBuffer = await logoResponse.arrayBuffer();
    const splashBuffer = await splashResponse.arrayBuffer();

    zip.file("images/logo_hd.png", logoBuffer);
    zip.file("images/splash_hd.png", splashBuffer);
    
    const manifestContent = `
title=Crate TV
major_version=1
minor_version=2
build_version=0

# Roku Channel Store Artwork
mm_icon_focus_hd=pkg:/images/logo_hd.png

# Splash Screen
splash_screen_hd=pkg:/images/splash_hd.png
splash_color=#141414
    `.trim();

    zip.file("manifest", manifestContent);
    // --- End of dynamic additions ---

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // The Vercel/Node.js runtime's `Response` constructor can accept a Buffer directly.
    // We cast to `any` to bypass a TypeScript error caused by conflicting DOM and Node.js type definitions.
    return new Response(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="cratetv-roku-channel.zip"',
      },
    });

  } catch (error) {
    console.error("Error generating Roku ZIP:", error);
    const errorMessage = error instanceof Error ? `Failed to generate package: ${error.message}. Ensure the 'roku' directory exists.` : 'An unknown server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}