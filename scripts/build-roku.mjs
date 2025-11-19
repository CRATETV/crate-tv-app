import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import process from 'process';
// FIX: Import Buffer to make it available in this module's scope.
import { Buffer } from 'buffer';

async function readDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
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

    const args = process.argv.slice(2);
    const isLocalBuild = args.includes('--local');
    
    // More robust IP parsing
    let localIp = null;
    const ipArg = args.find(arg => arg.startsWith('--ip=') || /--(\d{1,3}\.){3}\d{1,3}/.test(arg));
    if (ipArg) {
        if (ipArg.startsWith('--ip=')) {
            localIp = ipArg.split('=')[1];
        } else {
            localIp = ipArg.substring(2); // Remove the '--'
        }
    }

    if (isLocalBuild && !localIp) {
        console.error('❌ Error: Local IP address is required for a local build. Use --ip=<your_ip> or --<your_ip>');
        process.exit(1);
    }

    const projectRoot = process.cwd();
    const rokuDir = path.join(projectRoot, 'roku');
    const distDir = path.join(projectRoot, 'dist');
    const outputZipPath = path.join(distDir, 'cratetv-roku-channel.zip');

    try {
        await fs.mkdir(distDir, { recursive: true });

        const filesToInclude = await readDirectory(rokuDir);
        const zip = new JSZip();

        // Roku requires the manifest to be the first file and uncompressed.
        const manifestContent = await fs.readFile(path.join(rokuDir, 'manifest'), 'utf-8');
        zip.file('manifest', manifestContent.replace(/\r\n/g, '\n'), { compression: "STORE", unixPermissions: 0o644 });

        for (const file of filesToInclude) {
            const zipPath = path.relative(rokuDir, file).replace(/\\/g, '/');
            if (zipPath === 'manifest') continue; // Already handled

            let content = await fs.readFile(file);
            let finalContent = content;

            if (zipPath.endsWith('.brs') || zipPath.endsWith('.xml')) {
                let textContent = content.toString('utf-8');
                
                if (isLocalBuild && zipPath === 'source/Config.brs') {
                    textContent = textContent.replace('API_URL_PLACEHOLDER', `http://${localIp}:5373/api`);
                    console.log(`Injecting local IP ${localIp} into Config.brs`);
                } else if (zipPath === 'source/Config.brs') {
                    // For production builds, we will inject the Vercel URL later.
                    // For now, we leave the placeholder. This script is only for local/direct packaging.
                }
                
                finalContent = Buffer.from(textContent.replace(/\r\n/g, '\n'), 'utf-8');
            }

            zip.file(zipPath, finalContent, { unixPermissions: 0o644 });
        }

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            platform: 'UNIX',
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        await fs.writeFile(outputZipPath, zipBuffer);
        
        // Roku's web uploader expects a .pkg extension for sideloading.
        const pkgOutputPath = outputZipPath.replace('.zip', '.pkg');
        await fs.copyFile(outputZipPath, pkgOutputPath);

        console.log(`✅ Roku channel successfully packaged.`);
        console.log(`   - For sideloading: ${pkgOutputPath}`);

    } catch (error) {
        console.error('❌ Error packaging Roku channel:', error);
        process.exit(1);
    }
}

main();