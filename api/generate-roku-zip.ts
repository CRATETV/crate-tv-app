import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
// FIX: Import Buffer to make it available in this module's scope.
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
    
    // For local development, trust requests from localhost for the build script
    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) {
        isAuthenticated = true;
    } else {
        // For all other requests (like from the live Admin Panel), require a password.
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
            // This can fail if no JSON body is sent, which is fine.
            // isAuthenticated will remain false.
        }
    }
    
    // Also allow for first-time setup mode if no passwords are set at all
    const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) {
        isAuthenticated = true; 
    }

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rokuDir = path.join((process as any).cwd(), 'roku');
    const filesToInclude = await readDirectory(rokuDir);
    const zip = new JSZip();

    // Read the manifest file from the project, apply encoding fixes, and add it uncompressed.
    const manifestPath = path.join(rokuDir, 'manifest');
    const manifestContentBuffer = await fs.readFile(manifestPath);
    let manifestContent = manifestContentBuffer.toString('utf-8');
    if (manifestContent.startsWith('\uFEFF')) {
      manifestContent = manifestContent.substring(1); // Strip BOM
    }
    manifestContent = manifestContent.replace(/\r\n?/g, '\n'); // Normalize line endings
    zip.file('manifest', manifestContent, { compression: "STORE", unixPermissions: 0o644 });


    // Add all other local files from the /roku directory to the zip.
    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        let zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Skip the manifest file since we've already added it
        if (zipPath === 'manifest') continue;

        // Rename image files inside the zip to match the user's manifest specification
        if (zipPath === 'images/logo_hd.png') {
            zipPath = 'images/roku_icon_540x405.png';
        }
        if (zipPath === 'images/splash_hd.jpg') {
            zipPath = 'images/splash_screen_1920x1080.png';
        }

        // For text files, strip BOM, normalize line endings, and perform replacements
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml')) {
            let textContent = contentBuffer.toString('utf-8');
            if (textContent.startsWith('\uFEFF')) {
                textContent = textContent.substring(1);
            }
            textContent = textContent.replace(/\r\n?/g, '\n');
            finalContent = textContent;
        }

        if (finalContent.length > 0) {
            zip.file(zipPath, finalContent, { unixPermissions: 0o644 });
        }
    }
    
    // Generate the final zip file.
    const zipBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        platform: 'UNIX',
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });

    // Return the zip file to the client
    return new Response(zipBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="cratetv-roku-channel.pkg"',
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