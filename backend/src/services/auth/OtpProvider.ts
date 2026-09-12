export interface IOtpProvider {
  /**
   * Verifies the provided OTP for the given challenge.
   * Note: The challenge must already be validated for expiration and status.
   */
  verifyOtp(challengeId: string, otp: string): Promise<boolean>;
}

export class StaticOtpProvider implements IOtpProvider {
  async verifyOtp(_challengeId: string, otp: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Static OTP Provider cannot be used in production environment');
    }
    
    const configuredOtp = process.env.ADMIN_STATIC_OTP;
    if (!configuredOtp) {
      throw new Error('ADMIN_STATIC_OTP is not configured');
    }
    
    return otp === configuredOtp;
  }
}

// In the future, this can be swapped with EmailOtpProvider
export const otpProvider: IOtpProvider = new StaticOtpProvider();
