import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

// Helper to recursively read a directory, ignoring dotfiles
async function readDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        if (entry.name.startsWith('.')) return [];
        const res = path.resolve(dirPath, entry.name);
        return entry.isDirectory() ? readDirectory(res) : res;
    }));
    return files.flat();
}

export async function POST(request: Request) {
  try {
    // Authentication (same as the main packager)
    let isAuthenticated = false;
    const host = request.headers.get('host');
    try {
        const { password } = await request.json();
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        } else {
             for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
    } catch (e) {
        // No password needed for localhost or if no passwords are set
    }
    const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (host?.startsWith('localhost') || !anyPasswordSet) {
        isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    // Dynamically set feed URL
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const domain = `${protocol}://${host}`;
    const apiUrl = `${domain}/api`;

    // Add all files from /roku to the zip
    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        const zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Normalize line endings for text files and perform replacements
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml')) {
            let textContent = contentBuffer.toString('utf-8').replace(/\r\n/g, '\n');
            
            if (zipPath === 'source/Config.brs') {
                textContent = textContent.replace('API_URL_PLACEHOLDER', apiUrl);
            }
            
            finalContent = textContent;
        }

        if (finalContent.length > 0) {
            zip.file(zipPath, finalContent);
        }
    }
    
    // Generate a standard ZIP file
    const zipBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        platform: 'UNIX',
        compression: "DEFLATE"
    });

    return new Response(zipBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="cratetv-roku-source.zip"',
        },
    });

  } catch (error) {
    console.error("Error generating Roku source ZIP:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}