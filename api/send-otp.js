import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to_email, to_name, otp_code } = req.body;

  if (!to_email || !otp_code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check env vars are configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:2px;">🏏 GGPL</div>
              <div style="color:#a7f3d0;font-size:13px;margin-top:4px;font-weight:500;text-transform:uppercase;letter-spacing:2px;">Cricket Score Tracker</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px 0;">Hi <strong style="color:#34d399;">${to_name || 'there'}</strong>,</p>
              <p style="color:#94a3b8;font-size:14px;margin:0 0 28px 0;line-height:1.6;">
                We received a request to reset your GGPL password. Use the verification code below to continue.
              </p>

              <!-- OTP Box -->
              <div style="background:#0f172a;border:2px solid #34d399;border-radius:16px;padding:28px;text-align:center;margin:0 0 28px 0;">
                <div style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;">Your Verification Code</div>
                <div style="font-size:52px;font-family:'Courier New',monospace;font-weight:900;color:#34d399;letter-spacing:16px;line-height:1;">${otp_code}</div>
                <div style="color:#475569;font-size:12px;margin-top:16px;">⏱ Expires in <strong style="color:#fbbf24;">10 minutes</strong></div>
              </div>

              <div style="background:#162032;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="color:#64748b;font-size:12px;margin:0;line-height:1.6;">
                  🔒 <strong style="color:#94a3b8;">Security tip:</strong> GGPL will never ask for this code via phone or chat. 
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>

              <p style="color:#475569;font-size:13px;margin:0;">
                If you have any issues, just reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#334155;font-size:11px;margin:0;">
                © 2025 GGPL Cricket Score Tracker · Sent automatically
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: `"GGPL Cricket Tracker" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: `🏏 Your GGPL verification code: ${otp_code}`,
      html: htmlBody,
      text: `Hi ${to_name},\n\nYour GGPL password reset code is: ${otp_code}\n\nThis code expires in 10 minutes.\n\n— GGPL Cricket Score Tracker`,
    });

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
