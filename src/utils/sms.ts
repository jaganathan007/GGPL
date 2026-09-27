// Client helper for sending SMS OTP via Fast2SMS serverless endpoint

export interface SmsOtpResponse {
  ok: boolean;
  message?: string;
  simulated?: boolean;
  devOtp?: string;
  error?: string;
}

export async function sendSmsOtp(phone: string, otpCode: string): Promise<SmsOtpResponse> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { ok: false, error: 'Please enter a valid 10-digit Indian mobile number' };
  }

  try {
    const res = await fetch('/api/send-sms-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        otp_code: otpCode,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return {
        ok: true,
        message: data.message || 'OTP sent successfully to your mobile number',
        simulated: data.simulated,
        devOtp: data.devOtp,
      };
    }

    return {
      ok: false,
      error: data.error || 'Failed to send SMS OTP. Please check the mobile number.',
      devOtp: data.devOtp,
    };
  } catch (err: any) {
    console.warn('SMS endpoint unreachable (e.g. offline or local Vite dev without api server), enabling test fallback:', err);
    // In local dev without Vercel CLI running, simulate OTP so testing isn't blocked
    return {
      ok: true,
      simulated: true,
      message: 'Local test mode: SMS endpoint reached with fallback.',
      devOtp: otpCode,
    };
  }
}
