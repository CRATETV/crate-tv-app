// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
// FIX: The `process` global was not correctly typed in this environment, causing an error on `process.cwd()`.
// Importing `cwd` directly from the `node:process` module resolves this typing issue.
import { cwd } from 'node:process';

const splashKey = "Crate TV Splash.png";
const logoKey = "ruko logo .webp";

let s3Client: S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
        console.error("AWS S3 credentials are not configured for Roku ZIP generation.");
        return null;
    }
    
    if (region === 'global') {
        region = 'us-east-1';
    }

    s3Client = new S3Client({
        region: region,
        credentials: { accessKeyId, secretAccessKey },
    });
    return s3Client;
}

const getS3Object = async (bucket: string, key: string): Promise<Uint8Array | null> => {
    const client = getS3Client();
    if (!client) {
        console.warn("S3 Client could not be initialized. Cannot fetch branding images.");
        return null;
    }
    try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await client.send(command);
        if (!response.Body) {
            throw new Error(`S3 object body is empty for key: ${key}`);
        }
        return response.Body.transformToByteArray();
    } catch (error) {
        console.error(`Failed to fetch S3 object '${key}':`, error);
        return null;
    }
};

// Helper to read a file from the 'roku' directory
const readRokuFile = (filePath: string) => {
    return fs.readFileSync(path.join(cwd(), 'roku', filePath), 'utf-8');
};

export async function GET(request: Request) {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("AWS_S3_BUCKET_NAME environment variable is not set.");
        }
        
        const zip = new JSZip();

        // Add core files by reading them from the filesystem
        zip.file('manifest', readRokuFile('manifest'));
        zip.folder('source')?.file('main.brs', readRokuFile('source/main.brs'));

        // Add component files
        const componentsFolder = zip.folder('components');
        const componentFiles = [
            'HomeScene.xml', 'HomeScene.brs',
            'VideoPlayerScene.xml', 'VideoPlayerScene.brs',
            'MoviePoster.xml', 'MoviePoster.brs'
        ];
        componentFiles.forEach(fileName => {
            componentsFolder?.file(fileName, readRokuFile(`components/${fileName}`));
        });

        // Fetch and add images, with graceful failure
        const [logoImage, splashImage] = await Promise.all([
            getS3Object(bucketName, logoKey),
            getS3Object(bucketName, splashKey),
        ]);

        const imagesFolder = zip.folder('images');
        if (logoImage) {
            imagesFolder?.file('logo_400x90.png', logoImage);
        } else {
            console.warn("Could not add logo to Roku package.");
        }
        if (splashImage) {
            imagesFolder?.file('splash_hd_1280x720.png', splashImage);
            imagesFolder?.file('splash_fhd_1920x1080.png', splashImage);
        } else {
            console.warn("Could not add splash screen to Roku package.");
        }

        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        return new Response(zipContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratv.zip"'
            }
        });

    } catch (error) {
        console.error("Failed to generate Roku ZIP:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate Roku package: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}