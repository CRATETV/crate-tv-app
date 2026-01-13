
import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

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

export async function POST(request: Request) {
  try {
    let isAuthenticated = false;
    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const apiUrl = `${protocol}://${host}/api`;
    
    try {
        const { password } = await request.json();
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
    } catch (e) {}

    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) isAuthenticated = true;
    if (!isAuthenticated) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    if (filesToInclude.length === 0) throw new Error("Roku source missing.");

    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Clean logic for Roku-sensitive files
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml') || zipPath === 'manifest') {
            let textContent = contentBuffer.toString('utf-8');
            
            // Fix: Strip Byte Order Mark (BOM) - Critical for Roku compilation
            if (textContent.charCodeAt(0) === 0xFEFF) {
                textContent = textContent.substring(1);
            }
            
            // Fix: Normalize line endings to Unix style (LF)
            textContent = textContent.replace(/\r\n/g, '\n');

            // Dynamic Config Binding
            if (zipPath === 'source/Config.brs') {
                textContent = textContent.replace('API_URL_PLACEHOLDER', apiUrl);
            }

            finalContent = textContent;
        }

        zip.file(zipPath, finalContent, { unixPermissions: 0o644 });
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
            'Content-Disposition': 'attachment; filename="cratetv-production-roku-v4.zip"',
        },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Packager failed." }), { status: 500 });
  }
}
