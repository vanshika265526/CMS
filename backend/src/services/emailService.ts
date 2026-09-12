import axios from 'axios';
import SystemLog from '../models/SystemLog.js';

export class EmailService {
  private getApiKey(): string {
    const key = process.env.BREVO_API_KEY;
    if (!key) {
      throw new Error('BREVO_API_KEY configuration is missing.');
    }
    return key;
  }

  private getMailFromEmail(): string {
    const email = process.env.MAIL_FROM_EMAIL;
    if (!email) {
      throw new Error('MAIL_FROM_EMAIL configuration is missing.');
    }
    return email;
  }

  private getMailFromName(): string {
    const name = process.env.MAIL_FROM_NAME;
    if (!name) {
      throw new Error('MAIL_FROM_NAME configuration is missing.');
    }
    return name;
  }

  public validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim().toLowerCase());
  }

  public sanitizeContent(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public validateApplicationUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  public async sendPlacementEmail(recipientEmail: string, recipientName: string, placement: any): Promise<string> {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid recipient email address format: ${recipientEmail}`);
    }

    const apiKey = this.getApiKey();
    const fromEmail = this.getMailFromEmail();
    const fromName = this.getMailFromName();

    const company = placement.companyName || 'Not specified';
    const role = placement.role || 'Not specified';
    const packageCTC = placement.package ? `${placement.package} LPA` : 'Not specified';
    const location = placement.location || 'Not specified';
    const deadline = placement.deadline ? new Date(placement.deadline).toLocaleDateString() : 'Not specified';
    
    // Check applicationLink url security
    const applicationUrl = placement.applicationLink || '';
    if (applicationUrl && !this.validateApplicationUrl(applicationUrl)) {
      throw new Error(`Rejected unsafe application link URL scheme: ${applicationUrl}`);
    }

    // Build eligibility summary from placement fields
    const branches = placement.branchesEligible && placement.branchesEligible.length > 0
      ? placement.branchesEligible.join(', ')
      : 'All branches';
    const years = placement.yearEligible && placement.yearEligible.length > 0
      ? placement.yearEligible.join(', ')
      : 'All batches';
    const minGPA = placement.eligibilityGPA ? `Min CGPA: ${placement.eligibilityGPA}` : 'No GPA bar';
    const eligibilitySummary = `Branches: ${branches}; Batches: ${years}; ${minGPA}`;

    const sanitizedName = this.sanitizeContent(recipientName);
    const sanitizedCompany = this.sanitizeContent(company);
    const sanitizedRole = this.sanitizeContent(role);

    const subject = `New Placement Opportunity: ${company} — ${role}`;

    const textBody = `Hello ${recipientName},

A new placement opportunity has been published for your college.

Company:
${company}

Role:
${role}

Package:
${packageCTC}

Location:
${location}

Eligibility:
${eligibilitySummary}

Application Deadline:
${deadline}

Apply:
${applicationUrl || 'Not specified'}

Regards,
Placement Cell`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">New Placement Opportunity</h2>
        <p>Hello <strong>${sanitizedName}</strong>,</p>
        <p>A new placement opportunity has been published for your college.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Company</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizedCompany}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Role</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizedRole}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Package</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${packageCTC}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.sanitizeContent(location)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Eligibility</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.sanitizeContent(eligibilitySummary)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Application Deadline</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${deadline}</td>
          </tr>
        </table>
        ${applicationUrl ? `
        <p style="margin-top: 25px;">
          <a href="${applicationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Apply Now</a>
        </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">Regards,<br/>Placement Cell</p>
      </div>
    `;

    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: fromName, email: fromEmail },
          to: [{ email: recipientEmail, name: recipientName }],
          subject,
          htmlContent: htmlBody,
          textContent: textBody
        },
        {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10s timeout
        }
      );

      const messageId = response.data?.messageId || '';

      // Log success cleanly (avoid logging API keys or full bodies or student names/emails)
      await SystemLog.create({
        category: 'NOTIFICATION_LOG',
        level: 'info',
        message: `Email alert sent successfully`,
        metadata: { placementId: placement._id, messageId }
      }).catch(() => {});

      return messageId;
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      const cleanMsg = errorData ? JSON.stringify(errorData) : error.message;

      // Ensure API Key never leaks in error message
      const sanitizedError = cleanMsg.replace(apiKey, '[BREVO_API_KEY_REDACTED]');
      throw { status: status || 500, message: sanitizedError };
    }
  }
}

export const emailService = new EmailService();
