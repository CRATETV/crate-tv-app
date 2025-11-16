import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
// FIX: The `process` global is not available by default in some strict TypeScript or module contexts. Importing it directly from the 'process' module resolves the error where 'cwd' and 'exit' properties were not found.
import process from 'process';

// Helper to recursively read a directory, ignoring dotfiles
async function readDirectory(dirPath) {
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

async function main() {
    console.log('Starting Roku channel packaging...');

    const projectRoot = process.cwd();
    const rokuDir = path.join(projectRoot, 'roku');
    const distDir = path.join(projectRoot, 'dist');
    const outputZipPath = path.join(distDir, 'cratetv-roku-channel.zip');

    try {
        // Ensure dist directory exists
        await fs.mkdir(distDir, { recursive: true });

        const filesToInclude = await readDirectory(rokuDir);
        const zip = new JSZip();

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
        
        // Create the manifest file
        // IMPORTANT: Roku expects the manifest to be the first file and UNCOMPRESSED.
        zip.file('manifest', manifestContent, { compression: "STORE", unixPermissions: 0o644 });


        // Add all files from /roku to the zip
        for (const file of filesToInclude) {
            const content = await fs.readFile(file);
            const zipPath = path.relative(rokuDir, file);
            if (content.length > 0) {
                // Explicitly set standard file permissions to avoid "invalid header" errors on Roku.
                zip.file(zipPath, content, { unixPermissions: 0o644 });
            }
        }
        
        // Generate and write the zip file
        // Specifying the platform and compression is crucial for Roku compatibility.
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            platform: 'UNIX',
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        });
        await fs.writeFile(outputZipPath, zipBuffer);
        
        // Also create a .pkg file for the Roku web uploader
        const pkgOutputPath = outputZipPath.replace('.zip', '.pkg');
        await fs.copyFile(outputZipPath, pkgOutputPath);

        console.log(`✅ Roku channel successfully packaged.`);
        console.log(`   - For terminal deployment: ${outputZipPath}`);
        console.log(`   - For web uploader:      ${pkgOutputPath}`);

    } catch (error) {
        console.error('❌ Error packaging Roku channel:', error);
        process.exit(1);
    }
}

main();