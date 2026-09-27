// Serverless function for Vercel: /api/send-sms-otp
// Sends SMS OTP using Fast2SMS API (for Indian mobile numbers)

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, otp_code } = req.body || {};

  if (!phone || !otp_code) {
    return res.status(400).json({ error: 'Missing phone number or OTP code' });
  }

  // Extract clean 10-digit mobile number
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
  }

  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // If FAST2SMS_API_KEY is not configured yet in Vercel Environment Variables,
    // return simulation mode with devOtp so testing and UX verification works immediately.
    console.warn('FAST2SMS_API_KEY is not set in environment variables.');
    return res.status(200).json({
      success: true,
      simulated: true,
      message: 'Fast2SMS API key not found in Vercel environment variables. In test mode, OTP is displayed in app.',
      devOtp: String(otp_code),
    });
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables_values: String(otp_code),
        route: 'otp',
        numbers: cleanPhone,
      }),
    });

    const data = await response.json();

    if (data.return === true || (Array.isArray(data.message) && data.message[0]?.toLowerCase().includes('success'))) {
      return res.status(200).json({
        success: true,
        message: 'SMS OTP sent successfully to ' + cleanPhone,
      });
    } else {
      console.error('Fast2SMS returned error:', data);
      const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'SMS Gateway error');
      return res.status(400).json({
        error: errMsg,
        details: data,
        // In case of account credit limit or DLT issue, provide devOtp fallback
        devOtp: String(otp_code),
      });
    }
  } catch (error) {
    console.error('Error contacting Fast2SMS API:', error);
    return res.status(500).json({
      error: 'Failed to contact Fast2SMS API',
      details: error.message,
      devOtp: String(otp_code),
    });
  }
}
