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
 * CRITICAL CHARACTER PURGE V2
 * Prevents &h02 Line 1 Syntax Errors.
 * 1. Checks for physical BOM bytes (0xEF, 0xBB, 0xBF).
 * 2. Normalizes line endings.
 * 3. Prepends a safety comment for .brs files.
 */
function cleanBrightScript(buffer: Buffer, isConfig: boolean = false, apiUrl?: string): string {
    let startOffset = 0;
    // Physical check for UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        startOffset = 3;
    }

    let text = buffer.toString('utf8', startOffset);
    
    // Global artifact strip
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    if (isConfig && apiUrl) {
        text = text.replace('API_URL_PLACEHOLDER', apiUrl);
    }

    // Normalize and trim
    text = text.replace(/\r\n/g, '\n').trim();

    // Ensure it starts with a comment to "defrost" the Roku parser on line 1
    if (!text.startsWith("'")) {
        text = "' [CRATE_TV_FORGE_V4]\n" + text;
    }

    return text + "\n";
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

    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        if (zipPath.endsWith('.brs')) {
            finalContent = cleanBrightScript(contentBuffer, zipPath === 'source/Config.brs', apiUrl);
        } else if (zipPath.endsWith('.xml') || zipPath === 'manifest') {
            let text = contentBuffer.toString('utf-8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
            finalContent = text.trim() + "\n";
        }

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
            'Content-Disposition': `attachment; filename="cratetv-production-sdk.zip"`,
        },
    });

  } catch (error) {
    console.error("Packager Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal system failure." }), { status: 500 });
  }
}