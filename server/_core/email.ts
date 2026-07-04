import nodemailer from "nodemailer";

// Retrieve SMTP settings from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || `"JeevanOS Portal" <${SMTP_USER}>`;

// Create transporter if config is present
let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
} else {
  console.warn(
    "[Email Service] SMTP configuration missing. Falling back to Mock Console Mailer."
  );
}

/**
 * Send a raw email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error("[Email Service] Failed to send email via SMTP:", error);
      return false;
    }
  } else {
    console.log(`\n==================================================`);
    console.log(`[Email Mock Logger] To: ${to}`);
    console.log(`[Email Mock Logger] Subject: ${subject}`);
    console.log(`[Email Mock Logger] Content:`);
    console.log(html.replace(/<[^>]*>/g, " ").trim().substring(0, 500) + "...");
    console.log(`==================================================\n`);
    return true;
  }
}

/**
 * Common HTML wrap template for JeevanOS emails
 */
function wrapEmailTemplate(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f4f6f9;
            color: #333333;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            margin-top: 30px;
            margin-bottom: 30px;
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #1e3a8a;
            padding: 30px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            text-decoration: none;
            letter-spacing: 0.5px;
          }
          .logo span {
            color: #60a5fa;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          h1 {
            font-size: 20px;
            color: #1e293b;
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 700;
          }
          p {
            margin-top: 0;
            margin-bottom: 16px;
            color: #475569;
          }
          .button {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .otp-code {
            display: inline-block;
            background-color: #f1f5f9;
            color: #1e3a8a;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 4px;
            padding: 12px 30px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            margin: 20px 0;
          }
          .divider {
            height: 1px;
            background-color: #e2e8f0;
            margin: 24px 0;
          }
          .hint {
            font-size: 13px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <a href="#" class="logo">Jeevan<span>OS</span></a>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">This is an automated email from JeevanOS. Please do not reply.</p>
            <p style="margin: 0;">&copy; 2026 JeevanOS Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send Email Verification Code
 */
export async function sendEmailVerification(
  email: string,
  fullName: string,
  otp: string
): Promise<boolean> {
  const content = `
    <h1>Verify your email address</h1>
    <p>Hello ${fullName},</p>
    <p>Thank you for registering an account on JeevanOS. Please use the following 6-digit verification code (OTP) to verify your email address:</p>
    <div style="text-align: center;">
      <div class="otp-code">${otp}</div>
    </div>
    <p>This verification code is valid for 15 minutes. If you did not request this code, you can safely ignore this email.</p>
    <div class="divider"></div>
    <p class="hint">If you are having trouble verifying your email, please reach out to our system administrator.</p>
  `;
  return sendEmail(
    email,
    "[JeevanOS] Verify your email address",
    wrapEmailTemplate("Email Verification", content)
  );
}

/**
 * Send Password Reset Link
 */
export async function sendPasswordReset(
  email: string,
  fullName: string,
  resetLink: string
): Promise<boolean> {
  const content = `
    <h1>Reset your password</h1>
    <p>Hello ${fullName},</p>
    <p>We received a request to reset the password for your JeevanOS account. Click the button below to set a new password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button" target="_blank">Reset Password</a>
    </div>
    <p>This reset link is valid for 15 minutes and can only be used once. If you did not request a password reset, no further action is required.</p>
    <div class="divider"></div>
    <p class="hint">For security reasons, never share this link or forward this email to anyone.</p>
  `;
  return sendEmail(
    email,
    "[JeevanOS] Password reset request",
    wrapEmailTemplate("Password Reset", content)
  );
}

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(
  email: string,
  fullName: string
): Promise<boolean> {
  const content = `
    <h1>Welcome to JeevanOS!</h1>
    <p>Hello ${fullName},</p>
    <p>Your account on JeevanOS has been successfully registered and verified. You can now access the full suite of clinical and administrative workflows on the JeevanOS portal.</p>
    <p>We are excited to have you on board. If you need any assistance getting started, please check the system docs or contact support.</p>
    <div style="text-align: center;">
      <a href="${process.env.APP_URL || "https://jeevanos.up.railway.app"}" class="button" target="_blank">Access Portal</a>
    </div>
  `;
  return sendEmail(
    email,
    "Welcome to JeevanOS!",
    wrapEmailTemplate("Welcome to JeevanOS", content)
  );
}

/**
 * Send Password Changed Confirmation
 */
export async function sendPasswordChangedConfirmation(
  email: string,
  fullName: string
): Promise<boolean> {
  const content = `
    <h1>Password changed successfully</h1>
    <p>Hello ${fullName},</p>
    <p>This is a confirmation that the password for your JeevanOS account has been successfully changed.</p>
    <p>If you did not make this change, please contact our security team or administrator immediately to lock your account.</p>
    <div class="divider"></div>
    <p class="hint">For security reasons, we recommend updating your password regularly and using unique passwords.</p>
  `;
  return sendEmail(
    email,
    "[JeevanOS] Password changed successfully",
    wrapEmailTemplate("Password Changed", content)
  );
}
