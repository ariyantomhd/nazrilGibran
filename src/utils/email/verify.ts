// src/utils/email/verify.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (to: string, confirmationUrl: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'team@themavia.com', 
      to: to, 
      subject: 'Verify Your Themavia Account',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1F2833;">Welcome to Themavia!</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            Thank you for registering. Please click the button below to verify your email and activate your account:
          </p>
          <a href="${confirmationUrl}" style="background:#1F2833;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:15px;font-weight:bold;">
            Verify Account
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}" style="color: #1F2833; word-break: break-all;">${confirmationUrl}</a>
          </p>
        </div>
      `
    });

    // Validasi pencegat error dari Resend
    if (error) {
      throw new Error(error.message);
    }

    console.log(`✨ [Resend API Success]: Email terkirim ke ${to}`);
  } catch (error) {
    console.error('⚠️ [Resend API Error]:', error);
    throw error;
  }
};