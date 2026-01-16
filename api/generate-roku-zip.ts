import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Buffer } from 'buffer';
// FIX: Added import for process to ensure availability and correct typing/casting in various environments.
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

    // Allow internal or authenticated nodes
    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) isAuthenticated = true;
    
    if (!isAuthenticated) return new Response(JSON.stringify({ error: 'Unauthorized Infrastructure Access' }), { status: 401 });

    // FIX: Cast process to any to safely access cwd() method which may be missing from the environment's Process type definition.
    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    if (filesToInclude.length === 0) throw new Error("Roku source files missing from project root.");

    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // CRITICAL: Normalize text files for Roku (UTF-8, No BOM, LF line endings)
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml') || zipPath === 'manifest') {
            let textContent = contentBuffer.toString('utf-8');
            
            // Strip Byte Order Mark (BOM) - Critical for Roku compilation
            if (textContent.charCodeAt(0) === 0xFEFF) {
                textContent = textContent.substring(1);
            }
            
            // Normalize line endings to Unix style (LF)
            textContent = textContent.replace(/\r\n/g, '\n');

            // Dynamic Config Binding: Inject the live API URL into the channel
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
            'Content-Disposition': `attachment; filename="CrateTV_Roku_Source_V4_${Date.now()}.zip"`,
            'X-Crate-API-Target': apiUrl
        },
    });

  } catch (error) {
    console.error("Packager Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal system failure." }), { status: 500 });
  }
}
