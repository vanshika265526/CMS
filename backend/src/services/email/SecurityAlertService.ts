import axios from 'axios';
import SystemLog from '../../models/SystemLog.js';

export class SecurityAlertService {
  private getApiKey(): string | null {
    return process.env.BREVO_API_KEY || null;
  }

  private getMailFromEmail(): string {
    return process.env.MAIL_FROM_EMAIL || 'security@ngcms.local';
  }

  private getMailFromName(): string {
    return process.env.MAIL_FROM_NAME || 'NgCMS Security';
  }

  public async sendSecurityAlert(
    adminEmail: string,
    adminName: string,
    eventType: 'ACCOUNT_LOCKED' | 'OTP_FAILURE_LIMIT_REACHED',
    lockDurationMinutes?: number
  ): Promise<void> {
    const apiKey = this.getApiKey();
    // If no API key is present, we silently fail to prevent breaking the auth flow, 
    // as per requirements: "Email failure must NEVER prevent or roll back the authentication lockout/security action."
    if (!apiKey) return;

    const fromEmail = this.getMailFromEmail();
    const fromName = this.getMailFromName();

    let subject = 'Security Alert: Suspicious Login Activity';
    let textBody = `Hello ${adminName},\n\nWe detected suspicious activity on your admin account.\n\nEvent: ${eventType}\n`;

    if (eventType === 'ACCOUNT_LOCKED' && lockDurationMinutes) {
      subject = 'Security Alert: Admin Account Locked';
      textBody += `Your account has been temporarily locked for ${lockDurationMinutes} minutes due to multiple failed password attempts.\n`;
    } else if (eventType === 'OTP_FAILURE_LIMIT_REACHED') {
      subject = 'Security Alert: Failed Two-Step Verification';
      textBody += `Multiple incorrect OTP verification attempts were made on your account.\n`;
    }

    textBody += `\nTime: ${new Date().toUTCString()}\n\nIf this was not you, please contact the system administrator or security team immediately.\n\nRegards,\nNgCMS Security System`;

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: fromName, email: fromEmail },
          to: [{ email: adminEmail, name: adminName }],
          subject,
          textContent: textBody
        },
        {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000 // Short timeout to prevent holding up the auth request
        }
      );
    } catch (error: any) {
      // Do not throw the error to prevent auth flow rollback.
      // We log it securely without exposing secrets.
      await SystemLog.create({
        category: 'ADMIN_AUTH',
        level: 'error',
        message: 'Failed to send security alert email',
        metadata: { eventType, error: error.message }
      }).catch(() => {});
    }
  }
}

export const securityAlertService = new SecurityAlertService();
