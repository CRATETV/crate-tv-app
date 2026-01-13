
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, category } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Node access.' }), { status: 401 });
    }

    const categoryPrompts = {
        open_master: "High-production value 4K short films from Blender Studio Open Projects released 2023-2025 CC-BY license. Target titles: 'Charge', 'Wing It!', 'Coffee Run'. Search for official Blender Studio mirrors.",
        modern_short: "Independent cinematic short films from Vimeo Staff Picks or curated Vimeo groups released 2023-2025 with CC-BY license only. Look for festival-winning narratives released to public.",
        experimental: "Modern digital avant-garde and AI-assisted films 2024-2025 explicitly released under CC0 or CC-BY. High production value digital art films.",
        doc: "Short investigative documentaries or video essays released 2023-2025 by independent studios using Creative Commons redistribution licenses. High-quality journalism."
    };

    const prompt = `
        You are the Strategic Acquisitions lead for Crate