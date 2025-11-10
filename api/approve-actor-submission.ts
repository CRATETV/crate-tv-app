// This is a Vercel Serverless Function
// It will be accessible at the path /api/approve-actor-submission
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, ActorProfile } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';


// Helper to create a URL-friendly slug from a name
const slugify = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // collapse whitespace and replace with -
        .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
};


export async function POST(request: Request) {
  try {
    const { submissionId, password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
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
    const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) isAuthenticated = true;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    
    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    const auth = getAdminAuth(); // Get auth instance
    if (!db || !auth) throw new Error("Database or Auth connection failed.");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) throw new Error("Submission not found.");
    const submissionData = submissionDoc.data();
    if (!submissionData) throw new Error("Submission data is empty.");

    const { actorName, bio, photoUrl, highResPhotoUrl, imdbUrl, email } = submissionData;
    let userExists = false;

    // --- Grant Actor Role (Custom Claim) ---
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        userExists = true;
        await auth.setCustomUserClaims(userRecord.uid, {
            ...userRecord.customClaims,
            isActor: true
        });
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, we will instruct them to sign up.
            console.log(`User with email ${email} not found. They will be prompted to create an account.`);
        } else {
            console.warn(`Could not set custom claims for ${email}. Error: ${error.message}`);
        }
    }
    
    const batch = db.batch();

    // 1. Create or Update the public actor profile
    const actorSlug = slugify(actorName);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileData: ActorProfile = {
        name: actorName,
        slug: actorSlug,
        bio: bio,
        photo: photoUrl,
        highResPhoto: highResPhotoUrl,
        imdbUrl: imdbUrl || '',
    };
    batch.set(actorProfileRef, actorProfileData, { merge: true });

    // 2. If we found the user, also update their 'users' collection document for consistency
    if (userRecord) {
        const userProfileRef = db.collection('users').doc(userRecord.uid);
        batch.set(userProfileRef, { isActor: true, actorProfileSlug: actorSlug }, { merge: true });
    }

    // 3. Update the actor's info across all movies they appear in
    const moviesSnapshot = await db.collection('movies').get();
    let moviesUpdatedCount = 0;

    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        const cast = movieData.cast;
        let actorFound = false;

        const updatedCast = cast.map(actor => {
            if (actor.name.toLowerCase() === actorName.toLowerCase()) {
                actorFound = true;
                return {
                    ...actor,
                    bio,
                    photo: photoUrl,
                    highResPhoto: highResPhotoUrl
                };
            }
            return actor;
        });

        if (actorFound) {
            batch.update(movieDoc.ref, { cast: updatedCast });
            moviesUpdatedCount++;
        }
    });

    // 4. Mark submission as approved
    batch.update(submissionRef, { status: 'approved' });

    await batch.commit();

    // 5. Send notification email to the actor
    const signupUrl = 'https://cratetv.net/login?view=signup';
    const loginUrl = 'https://cratetv.net/login?redirect=/portal';

    const { subject, html } = userExists
        ? {
            subject: 'Your Crate TV Actor Portal is Active!',
            html: `
                <h1>Welcome to the Crate TV Actor Portal!</h1>
                <p>Hello ${actorName},</p>
                <p>We're excited to let you know that your profile has been approved and your Actor Portal is now active. You can log in to your existing account to access new tools and manage your profile.</p>
                <p><a href="${loginUrl}">Log in to your Portal</a></p>
                <p>Thank you for being part of our community!</p>
                <p>- The Crate TV Team</p>
            `
          }
        : {
            subject: 'Your Crate TV Profile has been Approved!',
            html: `
                <h1>Congratulations! Your Crate TV Profile is Live!</h1>
                <p>Hello ${actorName},</p>
                <p>We're excited to let you know that your profile submission has been approved and is now live in our Actors Directory.</p>
                <p><strong>Next Step:</strong> Create your account to access the Actor Portal where you can manage your profile and use our exclusive actor tools.</p>
                <p><a href="${signupUrl}">Create Your Account Now</a></p>
                <p><strong>Important:</strong> Please use the same email address you submitted with (${email}) when signing up.</p>
                <p>Welcome to the community!</p>
                <p>- The Crate TV Team</p>
            `
          };

    await resend.emails.send({
      from: `Crate TV <${fromEmail}>`,
      to: email,
      subject,
      html,
    });


    return new Response(JSON.stringify({ 
        success: true, 
        message: `Approved ${actorName}. Created/updated public profile, updated ${moviesUpdatedCount} film(s), and sent notification email.` 
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error approving submission:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}