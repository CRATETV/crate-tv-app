import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, ActorProfile } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';

const slugify = (name: string): string => {
    return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
};

export async function POST(request: Request) {
  try {
    const { submissionId, password } = await request.json();

    // Authentication check
    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("DB/Auth fail");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) throw new Error("Not found");
    const submissionData = submissionDoc.data()!;

    const { actorName, email } = submissionData;
    let userExists = false;

    try {
        const userRecord = await auth.getUserByEmail(email);
        userExists = true;
        await auth.setCustomUserClaims(userRecord.uid, { ...userRecord.customClaims, isActor: true });
    } catch (e) {}
    
    const batch = db.batch();
    const actorSlug = slugify(actorName);
    
    batch.set(db.collection('actor_profiles').doc(actorSlug), {
        name: actorName,
        slug: actorSlug,
        bio: submissionData.bio,
        photo: submissionData.photoUrl,
        highResPhoto: submissionData.highResPhotoUrl,
        imdbUrl: submissionData.imdbUrl || '',
    }, { merge: true });

    batch.update(submissionRef, { status: 'approved' });
    await batch.commit();

    // --- Send Email ---
    const subject = userExists ? 'Your Crate TV Actor Portal is Active!' : 'Your Crate TV Profile has been Approved!';
    const html = userExists 
        ? `<h1>Welcome!</h1><p>Hi ${actorName}, your portal is now active at cratetv.net/portal.</p>`
        : `<h1>Congrats!</h1><p>Hi ${actorName}, your profile is live. Sign up at cratetv.net/login?view=signup using ${email} to manage it.</p>`;

    await resend.emails.send({
      from: `Crate TV <${FROM_EMAIL}>`,
      to: [email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Approval API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500 });
  }
}