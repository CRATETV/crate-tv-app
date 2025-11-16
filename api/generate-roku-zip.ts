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
    // Read all files, including the 'images' directory.
    const filesToInclude = await readDirectory(rokuDir);

    const zip = new JSZip();

    // Dynamically determine the base API URL based on the request's host
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const domain = `${protocol}://${host}`;
    const apiUrl = `${domain}/api`;

    // Build the manifest string line-by-line to guarantee LF line endings.
    const manifestLines = [
        'title=Crate TV',
        'major_version=1',
        'minor_version=4',
        'build_version=0',
        'mm_icon_focus_hd=pkg:/images/logo_hd.png',
        'mm_icon_side_hd=pkg:/images/logo_hd.png',
        'splash_screen_hd=pkg:/images/splash_hd.png'
    ];
    const manifestContent = manifestLines.join('\n');


    // Create the manifest file dynamically, pointing to the artwork now in the zip
    // IMPORTANT: Roku expects the manifest to be the first file and UNCOMPRESSED.
    zip.file('manifest', manifestContent, { compression: "STORE", unixPermissions: 0o644 });


    // Add all local files from the /roku directory to the zip.
    for (const file of filesToInclude) {
        const contentBuffer = await fs.readFile(file);
        const zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
        let finalContent: string | Buffer = contentBuffer;

        // Normalize line endings for text files and perform replacements
        if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml')) {
            // More robust line ending normalization
            let textContent = contentBuffer.toString('utf-8').replace(/\r\n?/g, '\n');
            
            if (zipPath === 'source/Config.brs') {
                textContent = textContent.replace('API_URL_PLACEHOLDER', apiUrl);
            }
            
            finalContent = textContent;
        }

        if (finalContent.length > 0) {
            zip.file(zipPath, finalContent, { unixPermissions: 0o644 });
        }
    }
    
    // Generate the final zip file. Specifying the platform and compression is crucial for Roku compatibility.
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