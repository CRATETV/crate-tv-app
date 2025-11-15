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

    // Dynamically determine the feed URL based on the request's host
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const domain = `${protocol}://${host}`;
    const feedUrl = `${domain}/api/roku-feed`;

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


    // Add all local files (components, scripts, images etc.) from the /roku directory to the zip.
    for (const file of filesToInclude) {
        let content: string | Buffer = await fs.readFile(file);
        const zipPath = path.relative(rokuDir, file).replace(/\\/g, '/'); // Ensure forward slashes for zip path
        
        // If it's the config file, replace the placeholder URL with the live one.
        if (zipPath === 'source/Config.brs') {
            content = content.toString('utf-8').replace('ROKU_FEED_URL_PLACEHOLDER', feedUrl);
        }

        if (content.length > 0) {
            // Explicitly set standard file permissions to avoid "invalid header" errors on Roku.
            zip.file(zipPath, content, { unixPermissions: 0o644 });
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
    if (errorMessage.includes('ENOENT') && errorMessage.includes('roku/images')) {
        return new Response(JSON.stringify({ error: "Could not find branding images. Please make sure you have placed 'logo_hd.png' and 'splash_hd.png' inside the 'roku/images' directory." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}