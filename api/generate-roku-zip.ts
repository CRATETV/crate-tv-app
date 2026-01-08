import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

// Helper to recursively read a directory, ignoring dotfiles
async function readDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        // Ignore hidden files and directories (like .DS_Store)
        if (entry.name.startsWith('.')) {
            return [];
        }
        const res = path.resolve(dirPath, entry.name);
        return entry.isDirectory() ? readDirectory(res) : res;
    }));
    return files.flat();
}

export async function POST(request: Request) {
  try {
    let isAuthenticated = false;
    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const apiUrl = `${protocol}://${host}/api`;
    
    // For local development, trust requests from localhost for the build script
    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) {
        isAuthenticated = true;
    } else {
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
            // No auth if no body sent
        }
    }

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized Node Access' }), { status: 401 });
    }

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    // Standard Packaging Logic
    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Strip BOM and fix line endings for all Roku Source files
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml') || zipPath === 'manifest') {
            let textContent = contentBuffer.toString('utf-8');
            
            // CRITICAL: Strip Byte Order Mark (BOM) which causes &hb9 compilation failures
            if (textContent.startsWith('\uFEFF')) {
                textContent = textContent.substring(1);
            }
            
            // Normalize to Unix line endings
            textContent = textContent.replace(/\r\n?/g, '\n');

            // Inject API URL into Config
            if (zipPath === 'source/Config.brs') {
                textContent = textContent.replace('API_URL_PLACEHOLDER', apiUrl);
            }

            finalContent = textContent;
        }

        // Rename specific assets for channel requirements if necessary
        if (zipPath === 'images/logo_hd.png') zipPath = 'images/roku_icon_540x405.png';
        if (zipPath === 'images/splash_hd.jpg') zipPath = 'images/splash_screen_1920x1080.png';

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
            'Content-Disposition': 'attachment; filename="cratetv-v4-production.zip"',
        },
    });

  } catch (error) {
    console.error("Roku Build Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Compilation fail." }), { status: 500 });
  }
}
