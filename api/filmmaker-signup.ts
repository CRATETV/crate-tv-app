
// This is a Vercel Serverless Function
// Path: /api/filmmaker-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }

    // --- Firebase Admin Init ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Database or Auth connection failed.");

    // --- Step 1: Verify filmmaker name exists in movies DB ---
    const moviesSnapshot = await db.collection('movies').get();
    let personFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        const directors = (movieData.director || '').split(',').map(d => d.trim().toLowerCase());
        const producers = (movieData.producers || '').split(',').map(p => p.trim().toLowerCase());
        
        if (directors.includes(trimmedName) || producers.includes(trimmedName)) {
            personFound = true;
        }
    });

    if (!personFound) {
      return new Response(JSON.stringify({ error: "Name not found in our records as a director or producer. Please ensure it matches the film credits exactly." }), { status: 404, headers: {'Content-Type': 'application/json'} });
    }
    
    // --- Step 2: Create or Find Firebase user ---
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email, displayName: name });
        } else {
             if(error.code === 'auth/email-already-exists') {
                throw new Error("This email is a...
