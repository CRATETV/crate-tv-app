import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Buffer } from 'buffer';
import process from 'process';

async function readDirectory(dirPath: string): Promise<string[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = await Promise.all(entries.map((entry) => {
            if (entry.name.startsWith('.')) return [];
            const res = path.resolve(dirPath, entry.name);
            return entry.isDirectory() ? readDirectory(res) : res;
        }));
        return files.flat();
    } catch (e) {
        console.warn(`[Roku Packager] Path not found: ${dirPath}`);
        return [];
    }
}

/**
 * CRITICAL CLEANER: Purges "Ghost Codes"
 * Strips zero-width spaces, non-breaking spaces, and BOMs that often 
 * appear from copy-pasting from AI.
 */
function purgeGhostCharacters(text: string): string {
    return text
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // Strip ZWSP, ZWNJ, ZWJ, BOM, NBSP
        .replace(/\r\n/g, '\n')                     // Normalize to Unix LF
        .replace(/[ \t]+\n/g, '\n')                  // Strip trailing whitespace per line
        .trim() + '\n';                              // Roku requires trailing newline
}

export async function POST(request: Request) {
  try {
    let isAuthenticated = false;
    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const domain = `${protocol}://${host}`;
    const apiUrl = `${domain}/api`;
    
    try {
        const { password } = await request.json();
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
    } catch (e) {}

    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) isAuthenticated = true;
    
    if (!isAuthenticated) return new Response(JSON.stringify({ error: 'Unauthorized Infrastructure Access' }), { status: 401 });

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    if (filesToInclude.length === 0) throw new Error("Roku source directory is empty or missing.");

    // CHECK: Manifest must exist for a valid Roku app
    const hasManifest = filesToInclude.some(f => f.endsWith('manifest'));
    if (!hasManifest) throw new Error("CRITICAL_FAILURE: 'manifest' file missing from /roku folder.");

    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Clean text-based Roku files
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml') || zipPath === 'manifest') {
            let textContent = contentBuffer.toString('utf-8');
            
            // Deep clean artifacts
            textContent = purgeGhostCharacters(textContent);

            // Dynamic Config Binding
            if (zipPath === 'source/Config.brs') {
                textContent = textContent.replace('API_URL_PLACEHOLDER', apiUrl);
            }

            finalContent = textContent;
        }

        // Add to zip with Unix permissions
        zip.file(zipPath, finalContent, { 
            unixPermissions: 0o644,
            date: new Date()
        });
    }
    
    const zipBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        platform: 'UNIX',
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
    });

    return new Response(zipBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="cratetv-production-source-v4.zip"`,
            'X-Crate-API-Target': apiUrl
        },
    });

  } catch (error) {
    console.error("Packager Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal system failure." }), { status: 500 });
  }
}