import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, ActorProfile } from '../types.js';
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';

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
    const bodyHtml = userExists
        ? `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Actor Portal</p>
            <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;text-transform:uppercase;">Welcome, ${actorName}.</h1>
            <p style="margin:0 0 28px;">Your Crate TV actor portal is now active — you can manage your profile anytime.</p>
            ${renderEmailButton('Go To Your Portal', 'https://cratetv.net/portal')}
        `
        : `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Profile Approved</p>
            <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;text-transform:uppercase;">Congrats, ${actorName}!</h1>
            <p style="margin:0 0 28px;">Your profile is now live on Crate TV. Sign up using <strong>${email}</strong> to claim and manage it.</p>
            ${renderEmailButton('Create Your Account', 'https://cratetv.net/login?view=signup')}
        `;

    await resend.emails.send({
      from: `Crate TV <${FROM_EMAIL}>`,
      to: [email],
      subject,
      html: renderBrandedEmail({ title: subject, bodyHtml }),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Approval API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500 });
  }
}