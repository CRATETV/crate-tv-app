import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
    try {
        const { password, email, code, itemName, discountType, discountValue, customMessage } = await request.json();

        // 1. Authentication
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            // Check for additional dynamic admin passwords if set
            let allowed = false;
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!email || !code) {
            return new Response(JSON.stringify({ error: 'Recipient and code are required.' }), { status: 400 });
        }

        // 2. Format Email Content
        const isFree = discountType === 'one_time_access' || discountValue === 100;
        const subject = isFree ? `🎟️ VIP Invitation: Official Selection Access` : `🎫 Filmmaker Special: ${discountValue}% OFF Access`;
        
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; padding: 48px; border-radius: 32px; background-color: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 40px;">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" style="width: 140px; filter: invert(1);" />
                    <p style="text-transform: uppercase; font-size: 10px; letter-spacing: 4px; color: #999; font-weight: 900; margin-top: 16px;">Elite Independent Infrastructure</p>
                </div>
                
                <h1 style="color: #ef4444; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; text-align: center; margin-bottom: 24px;">Official Selection <br/>Voucher Issued</h1>
                
                <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 32px;">The Crate TV Admin team has authorized an exclusive access vector for your work: <strong>${itemName || 'the Crate Platform'}</strong>.</p>
                
                ${customMessage ? `<div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; font-style: italic; margin: 32px 0; color: #475569; text-align: center;">"${customMessage}"</div>` : ''}

                <div style="background-color: #000000; color: #ffffff; padding: 48px; text-align: center; border-radius: 24px; margin: 32px 0;">
                    <p style="margin: 0 0 16px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; color: #666; font-weight: 800;">Your Secure Entry Key</p>
                    <p style="margin: 0; font-size: 48px; font-weight: 900; letter-spacing: 8px; color: #ef4444; font-family: 'Courier New', Courier, monospace;">${code}</p>
                    <p style="margin: 24px 0 0 0; font-size: 13px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">${isFree ? '✓ FULL VIP ACTIVATION' : `✓ ${discountValue}% DISCOUNT APPLIED`}</p>
                </div>

                <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 32px;">
                    <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 16px;">Redemption Protocol:</h3>
                    <ul style="padding: 0; list-style: none; color: #64748b; font-size: 14px;">
                        <li style="margin-bottom: 12px; display: flex; align-items: start;">
                            <span style="color: #ef4444; font-weight: 900; margin-right: 12px;">01.</span>
                            <span>Direct Link: <a href="https://cratetv.net" style="color: #ef4444; text-decoration: none; font-weight: bold;">cratetv.net</a></span>
                        </li>
                        <li style="margin-bottom: 12px; display: flex; align-items: start;">
                            <span style="color: #ef4444; font-weight: 900; margin-right: 12px;">02.</span>
                            <span>Trigger the "Security Voucher" input field during checkout.</span>
                        </li>
                        <li style="margin-bottom: 12px; display: flex; align-items: start;">
                            <span style="color: #ef4444; font-weight: 900; margin-right: 12px;">03.</span>
                            <span>Execute the voucher to zero the balance or apply the filmmaker discount.</span>
                        </li>
                    </ul>
                </div>
                
                <p style="font-size: 10px; color: #cbd5e1; text-align: center; margin-top: 48px; text-transform: uppercase; font-weight: 800; letter-spacing: 2px;">© 2025 Crate TV // Global Studio Terminal</p>
            </div>
        `;

        await resend.emails.send({
            from: `Crate TV Admin <${FROM_EMAIL}>`,
            to: [email],
            subject,
            html: emailHtml,
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Distribution error:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Distribution failed." }), { status: 500 });
    }
}