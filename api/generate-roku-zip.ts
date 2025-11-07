// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-roku-zip

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
// FIX: Import Buffer to handle binary data types, as Node.js globals are not fully typed in this environment.
import { Buffer } from 'buffer';

// Helper to recursively read a directory
async function readDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        const res = path.resolve(dirPath, entry.name);
        return entry.isDirectory() ? readDirectory(res) : res;
    }));
    return files.flat();
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
        isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // FIX: Cast `process` to `any` to access `cwd()`. The TypeScript environment for V