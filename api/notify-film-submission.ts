import { Resend } from 'resend';

/**
 * FILM SUBMISSION NOTIFICATION
 * 
 * Sends a Netflix-style notification email to admin when a filmmaker submits a film.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            title, director, email, synopsis, runtime, year, genre,
            posterUrl, filmUrl, instagram, website, submissionKey
        } = body;

        const resendApiKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL || 'salomedenoon@gmail.com';

        if (!resendApiKey) {
            console.warn('RESEND_API_KEY not configured, skipping notification');
            return new Response(JSON.stringify({ success: false, error: 'Email not configured' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const resend = new Resend(resendApiKey);

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; color: #E50914;">CRATE</h1>
                        </td>
                    </tr>
                    
                    <!-- New Submission Alert -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">
                            
                            <!-- Poster Header -->
                            ${posterUrl ? `
                            <div style="position: relative; text-align: center; padding: 20px; background: linear-gradient(180deg, rgba(229,9,20,0.3) 0%, transparent 100%);">
                                <img src="${posterUrl}" alt="${title}" style="max-width: 200px; height: auto; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                            </div>
                            ` : ''}
                            
                            <!-- Content -->
                            <div style="padding: 30px;">
                                <!-- Badge -->
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <span style="background: linear-gradient(135deg, #E50914 0%, #B20710 100%); color: white; font-size: 10px; font-weight: 800; letter-spacing: 3px; padding: 8px 16px; border-radius: 20px; text-transform: uppercase;">
                                        🎬 NEW SUBMISSION
                                    </span>
                                </div>
                                
                                <!-- Title -->
                                <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: -1px;">
                                    ${title}
                                </h2>
                                
                                <!-- Director -->
                                <p style="margin: 0 0 24px 0; font-size: 14px; color: #E50914; text-align: center; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                                    Directed by ${director}
                                </p>
                                
                                <!-- Synopsis -->
                                ${synopsis ? `
                                <p style="margin: 0 0 24px 0; font-size: 14px; color: #999; text-align: center; line-height: 1.6; font-style: italic;">
                                    "${synopsis.substring(0, 200)}${synopsis.length > 200 ? '...' : ''}"
                                </p>
                                ` : ''}
                                
                                <!-- Details Grid -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                    <tr>
                                        ${runtime ? `<td style="padding: 8px; text-align: center; border-right: 1px solid #333;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Runtime</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${runtime}</div>
                                        </td>` : ''}
                                        ${year ? `<td style="padding: 8px; text-align: center; border-right: 1px solid #333;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Year</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${year}</div>
                                        </td>` : ''}
                                        ${genre ? `<td style="padding: 8px; text-align: center;">
                                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Genre</div>
                                            <div style="font-size: 16px; color: #fff; font-weight: 700; margin-top: 4px;">${genre}</div>
                                        </td>` : ''}
                                    </tr>
                                </table>
                                
                                <!-- Contact Info -->
                                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                                    <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">Filmmaker Contact</div>
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">📧 Email:</span>
                                                <a href="mailto:${email}" style="color: #E50914; font-size: 12px; text-decoration: none; margin-left: 8px;">${email}</a>
                                            </td>
                                        </tr>
                                        ${instagram ? `<tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">📷 Instagram:</span>
                                                <span style="color: #fff; font-size: 12px; margin-left: 8px;">${instagram}</span>
                                            </td>
                                        </tr>` : ''}
                                        ${website ? `<tr>
                                            <td style="padding: 4px 0;">
                                                <span style="color: #666; font-size: 12px;">🌐 Website:</span>
                                                <a href="${website}" style="color: #E50914; font-size: 12px; text-decoration: none; margin-left: 8px;">${website}</a>
                                            </td>
                                        </tr>` : ''}
                                    </table>
                                </div>
                                
                                <!-- Action Buttons -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px; text-align: center;">
                                            <a href="${filmUrl}" style="display: inline-block; background: #E50914; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 2px; padding: 14px 32px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
                                                ▶ Watch Film
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px; text-align: center;">
                                            <a href="https://cratetv.net/admin" style="display: inline-block; background: transparent; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 2px; padding: 12px 28px; border-radius: 8px; text-decoration: none; text-transform: uppercase; border: 1px solid #444;">
                                                Review in Admin
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 30px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #444;">
                                Submission ID: ${submissionKey}
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #444;">
                                © ${new Date().getFullYear()} CRATE TV. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        await resend.emails.send({
            from: 'CRATE <notifications@cratetv.net>',
            to: adminEmail,
            subject: `🎬 New Film Submission: "${title}" by ${director}`,
            html: emailHtml,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Notification email error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to send notification' 
        }), {
            status: 200, // Return 200 even on error so it doesn't break the submission
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
