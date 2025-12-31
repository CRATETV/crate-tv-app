import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const { actorName, senderName, senderEmail, message } = await request.json();

        if (!actorName || !senderName || !senderEmail || !message) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
        }

        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #ef4444; text-transform: uppercase; letter-spacing: 2px;">Professional Inquiry</h2>
                <p>A new talent inquiry has been submitted through the Crate TV Actors Directory.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Target Talent:</strong> ${actorName}</p>
                <p><strong>From:</strong> ${senderName} (${senderEmail})</p>
                <p><strong>Message:</strong></p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; font-style: italic;">
                    ${message.replace(/\n/g, '<br/>')}
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #999;">This inquiry was routed through the Crate TV secure proxy. Do not reply directly to this automated notification.</p>
            </div>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Talent Proxy <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            reply_to: senderEmail,
            subject: `🎭 Talent Inquiry: ${actorName} (via ${senderName})`,
            html: emailHtml
        });

        if (emailError) throw new Error(`Resend Error: ${emailError.message}`);
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Talent Inquiry API error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}