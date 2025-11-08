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
    } else {
        // Check for custom roles
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }

    // Also allow for first-time setup mode if no passwords are set at all
    const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) {
        isAuthenticated = true; 
    }

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rokuDir = path.join((process as any).cwd(), 'roku');
    // Read all files, but filter out the placeholder 'images' directory, as we'll fetch them live.
    const allFiles = await readDirectory(rokuDir);
    const filesToInclude = allFiles.filter(file => !file.includes(path.join('roku', 'images')));

    const zip = new JSZip();

    // Add all local files (components, scripts, etc.) from the /roku directory to the zip.
    for (const file of filesToInclude) {
        const content = await fs.readFile(file);
        const zipPath = path.relative(rokuDir, file);
        zip.file(zipPath, content);
    }
    
    // --- AUTOMATION: Fetch branding images from S3 and add them to the zip ---
    const logoUrl = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';
    const splashUrl = 'https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg';

    const [logoResponse, splashResponse] = await Promise.all([
        fetch(logoUrl),
        fetch(splashUrl)
    ]);

    if (!logoResponse.ok || !splashResponse.ok) {
        throw new Error('Failed to fetch required branding images from S3. Please check the URLs.');
    }

    const logoBuffer = await logoResponse.arrayBuffer();
    const splashBuffer = await splashResponse.arrayBuffer();

    // Add the fetched images to the zip with the correct paths and names required by Roku.
    zip.file('images/logo_hd.png', logoBuffer);
    zip.file('images/splash_hd.png', splashBuffer);
    // --- END OF AUTOMATION ---

    // Create the manifest file dynamically, pointing to the artwork now in the zip
    zip.file('manifest', `
title=Crate TV
major_version=1
minor_version=1
build_version=0
mm_icon_focus_hd=pkg:/images/logo_hd.png
mm_icon_side_hd=pkg:/images/logo_hd.png
splash_screen_hd=pkg:/images/logo_hd.png
`.trim());

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