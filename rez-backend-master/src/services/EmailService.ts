import { logger } from '../config/logger';
import sgMail from '@sendgrid/mail';
import { BRAND } from '../config/brand';

// Configure SendGrid - only if valid API key is provided
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const isValidSendGridKey: boolean = !!(SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.'));

if (isValidSendGridKey && SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else if (SENDGRID_API_KEY && !SENDGRID_API_KEY.startsWith('SG.')) {
  logger.info('⚠️ SendGrid API key is invalid (must start with "SG."). Email service disabled.');
}

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

export class EmailService {
  private static readonly FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@yourstore.com';
  private static readonly FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Your Store';

  /**
   * Send an email
   *
   * Behavior matrix:
   *   - SendGrid configured + valid key: send via SendGrid
   *   - SendGrid configured + invalid key: log error, fail loudly
   *   - SendGrid NOT configured:
   *       * In production: throw — never silently drop customer emails
   *         (an unconfigured email service in prod is a critical bug; OTPs
   *         and password resets would silently fail)
   *       * In dev/test: log a redacted preview (subject + recipient, but
   *         NEVER the body — OTPs, password reset tokens, PII must not
   *         end up in dev logs)
   */
  static async send(options: EmailOptions): Promise<void> {
    try {
      // SendGrid configured but invalid key — this is a config error
      if (SENDGRID_API_KEY && !isValidSendGridKey) {
        logger.error('❌ [EmailService] SENDGRID_API_KEY is set but invalid (must start with "SG.")');
        throw new Error('Email service misconfigured: invalid SendGrid API key');
      }

      // SendGrid not configured
      if (!isValidSendGridKey) {
        if (process.env.NODE_ENV === 'production') {
          // SECURITY: never silently drop customer emails in production
          // (an unconfigured email service would mean OTPs / password resets
          // are silently lost, which is a critical reliability bug).
          logger.error('❌ [EmailService] SENDGRID_API_KEY not configured in production — refusing to send', {
            to: options.to,
            subject: options.subject,
          });
          throw new Error('Email service is not configured. Set SENDGRID_API_KEY in production.');
        }

        // Dev / test mode: log a REDACTED preview. Do NOT log the body —
        // OTPs, password reset tokens, and PII must never end up in dev logs.
        const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        logger.info('📧 [EmailService] SendGrid not configured (dev mode) — would have sent', {
          to: recipient,
          subject: options.subject,
          bodyLength: (options.text?.length ?? 0) + (options.html?.length ?? 0),
          note: 'body content redacted in dev logs to prevent PII / OTP leakage',
        });
        return;
      }

      const msg: any = {
        to: options.to,
        from: {
          email: options.from || this.FROM_EMAIL,
          name: this.FROM_NAME,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...(options.templateId && {
          templateId: options.templateId,
          dynamicTemplateData: options.dynamicTemplateData,
        }),
      };

      await sgMail.send(msg);
      logger.info(`✅ Email sent successfully to ${options.to}`);
    } catch (error: any) {
      logger.error('❌ Email send error:', error);
      if (error.response) {
        logger.error('SendGrid error response:', error.response.body);
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send password change confirmation email
   */
  static async sendPasswordChangeConfirmation(
    merchantEmail: string,
    merchantName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .success-box { background: #d4edda; border: 2px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully ✅</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <div class="success-box">
              <p><strong>Your password has been changed successfully.</strong></p>
            </div>
            <p>This email confirms that your account password was recently changed.</p>
            <div class="warning-box">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>If you made this change, no further action is needed</li>
                <li>If you did NOT change your password, please contact support immediately</li>
                <li>Changed at: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p>For your security:</p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Never share your password with anyone</li>
              <li>Enable two-factor authentication if available</li>
            </ul>
            <p>If you have any concerns about your account security, please contact our support team immediately.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Password Changed Successfully - Security Notification',
      html,
      text: `Hi ${merchantName},\n\nYour password has been changed successfully at ${new Date().toLocaleString()}.\n\nIf you did not make this change, please contact support immediately.`,
    });
  }

  /**
   * Send welcome email to new merchant
   */
  static async sendWelcomeEmail(merchantEmail: string, merchantName: string, businessName?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Our Merchant Platform! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>Thank you for registering as a merchant on our platform!</p>
            <p>Your account has been successfully created. You can now:</p>
            <ul>
              <li>Add products to your store</li>
              <li>Manage inventory and pricing</li>
              <li>Track orders and sales</li>
              <li>View analytics and insights</li>
            </ul>
            <p>Get started by logging into your merchant dashboard:</p>
            <p style="text-align: center;">
              <a href="${process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/login" class="button">Go to Dashboard</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Welcome to Your Store - Merchant Account Created!',
      html,
      text: `Hi ${merchantName},\n\nThank you for registering as a merchant! Your account has been successfully created.`,
    });
  }

  /**
   * Send email verification (for merchants)
   */
  static async sendEmailVerification(
    merchantEmail: string,
    merchantName: string,
    verificationToken: string
  ): Promise<void> {
    // Use MERCHANT_FRONTEND_URL for merchant email verification, fallback to FRONTEND_URL
    const frontendUrl = process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address 📧</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>Please verify your email address to complete your merchant registration.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Verify Your Email Address',
      html,
      text: `Hi ${merchantName},\n\nPlease verify your email: ${verificationUrl}`,
    });
  }

  /**
   * Send password reset email (for merchants)
   */
  static async sendPasswordResetEmail(
    merchantEmail: string,
    merchantName: string,
    resetToken: string
  ): Promise<void> {
    // Use MERCHANT_FRONTEND_URL for merchant password resets, fallback to FRONTEND_URL
    const frontendUrl = process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #FF5722; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request 🔐</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>We received a request to reset your password.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Password Reset Request',
      html,
      text: `Hi ${merchantName},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(
    merchantEmail: string,
    merchantName: string,
    products: Array<{ name: string; stock: number; sku: string }>
  ): Promise<void> {
    const productsList = products
      .map((p) => `<li><strong>${p.name}</strong> (SKU: ${p.sku}) - Only ${p.stock} left!</li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 10px 20px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>The following products are running low on stock:</p>
            <div class="alert-box">
              <ul>
                ${productsList}
              </ul>
            </div>
            <p>Consider restocking these items to avoid running out of inventory.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/merchant/products" class="button">Manage Products</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `⚠️ Low Stock Alert - ${products.length} Product(s) Need Restocking`,
      html,
    });
  }

  /**
   * Send order notification
   */
  static async sendNewOrderNotification(
    merchantEmail: string,
    merchantName: string,
    orderDetails: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      total: number;
      items: number;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-box { background: white; border: 2px solid #4CAF50; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Order Received!</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>You have received a new order!</p>
            <div class="order-box">
              <p><strong>Order #:</strong> ${orderDetails.orderNumber}</p>
              <p><strong>Customer:</strong> ${orderDetails.customerName}</p>
              <p><strong>Items:</strong> ${orderDetails.items}</p>
              <p><strong>Total:</strong> ₹${orderDetails.total.toFixed(2)}</p>
            </div>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/merchant/orders/${orderDetails.orderId}" class="button">View Order</a>
            </p>
            <p>Please process this order as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `🎉 New Order #${orderDetails.orderNumber} - ₹${orderDetails.total}`,
      html,
    });
  }

  /**
   * Send onboarding step completed email
   */
  static async sendOnboardingStepCompleted(
    merchantEmail: string,
    merchantName: string,
    stepNumber: number,
    stepName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .progress-bar { background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
          .progress-fill { background: #4CAF50; height: 100%; text-align: center; line-height: 30px; color: white; font-weight: bold; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Step Completed! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>Great progress! You've successfully completed <strong>Step ${stepNumber}: ${stepName}</strong></p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(stepNumber / 5) * 100}%">${stepNumber}/5 Steps</div>
            </div>
            <p>Keep going! You're ${5 - stepNumber} step(s) away from completing your onboarding.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/onboarding" class="button">Continue Onboarding</a>
            </p>
            <p>If you have any questions, our support team is here to help.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `Step ${stepNumber} Completed - ${stepName}`,
      html,
      text: `Hi ${merchantName},\n\nYou've completed Step ${stepNumber}: ${stepName}. Keep going!`
    });
  }

  /**
   * Send onboarding submitted email
   */
  static async sendOnboardingSubmitted(
    merchantEmail: string,
    merchantName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Submitted! ✅</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>Congratulations! Your onboarding application has been successfully submitted.</p>
            <div class="info-box">
              <h3>What happens next?</h3>
              <ul>
                <li><strong>Review Process:</strong> Our team will review your application within 24-48 hours</li>
                <li><strong>Document Verification:</strong> We'll verify all submitted documents</li>
                <li><strong>Notification:</strong> You'll receive an email once the review is complete</li>
              </ul>
            </div>
            <p><strong>Typical review time:</strong> 1-2 business days</p>
            <p>We appreciate your patience during the review process. You'll be notified as soon as your application is approved.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Onboarding Application Submitted - Under Review',
      html,
      text: `Hi ${merchantName},\n\nYour onboarding application has been submitted and is under review. You'll hear from us within 24-48 hours.`
    });
  }

  /**
   * Send onboarding approved email
   */
  static async sendOnboardingApproved(
    merchantEmail: string,
    merchantName: string,
    storeId: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .success-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
          .button { display: inline-block; padding: 15px 40px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
          .next-steps { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard! 🎉</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Your Application Has Been Approved!</p>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <div class="success-box">
              <h2 style="color: #28a745; margin: 0;">Congratulations!</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your merchant account has been approved and your store is now live!</p>
            </div>
            <p>We're excited to have you as part of our merchant community.</p>
            <div class="next-steps">
              <h3>Next Steps:</h3>
              <ul>
                <li>✅ Your store has been created and is now active</li>
                <li>📦 Start adding products to your store</li>
                <li>🎨 Customize your store appearance</li>
                <li>📊 Set up your business hours and delivery options</li>
                <li>💰 Configure payment methods</li>
              </ul>
            </div>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/dashboard" class="button">Go to Dashboard</a>
            </p>
            <p><strong>Need help getting started?</strong> Check out our <a href="${process.env.FRONTEND_URL}/merchant/help">merchant guide</a> or contact our support team.</p>
            <p>We wish you great success with your store!</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>Store ID: ${storeId}</p>
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: '🎉 Congratulations! Your Merchant Account is Approved',
      html,
      text: `Hi ${merchantName},\n\nGreat news! Your merchant application has been approved. Your store is now live!\n\nVisit your dashboard: ${process.env.FRONTEND_URL}/merchant/dashboard`
    });
  }

  /**
   * Send onboarding rejected email
   */
  static async sendOnboardingRejected(
    merchantEmail: string,
    merchantName: string,
    reason: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>Thank you for your interest in becoming a merchant on our platform.</p>
            <p>After careful review, we're unable to approve your application at this time.</p>
            <div class="warning-box">
              <h3>Reason:</h3>
              <p>${reason}</p>
            </div>
            <h3>What You Can Do:</h3>
            <ul>
              <li>Review the reason for rejection</li>
              <li>Address the issues mentioned</li>
              <li>Submit a new application when ready</li>
              <li>Contact our support team if you need clarification</li>
            </ul>
            <p>We encourage you to reapply once you've addressed the concerns mentioned above.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/contact" class="button">Contact Support</a>
            </p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Merchant Application Update',
      html,
      text: `Hi ${merchantName},\n\nWe're unable to approve your merchant application at this time.\n\nReason: ${reason}\n\nPlease address the issues and reapply.`
    });
  }

  /**
   * Send document verification complete email
   */
  static async sendDocumentVerificationComplete(
    merchantEmail: string,
    merchantName: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    const html = approved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .success-box { background: #d4edda; border: 2px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Documents Verified! ✅</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <div class="success-box">
              <p><strong>Good news!</strong> All your documents have been verified successfully.</p>
            </div>
            <p>Your onboarding is now complete and under final review. You'll receive an approval notification soon.</p>
            <p>Thank you for your patience!</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Review Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>We've reviewed your submitted documents and need some corrections.</p>
            <div class="warning-box">
              <h3>Issue:</h3>
              <p>${reason || 'Some documents need to be resubmitted'}</p>
            </div>
            <p>Please upload the corrected documents to continue with your onboarding.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/onboarding" class="button">Upload Documents</a>
            </p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: approved ? 'Documents Verified Successfully' : 'Document Verification Required',
      html,
      text: approved
        ? `Hi ${merchantName},\n\nAll your documents have been verified successfully!`
        : `Hi ${merchantName},\n\nSome documents need correction: ${reason}`
    });
  }

  /**
   * Send document approved email
   */
  static async sendDocumentApproved(
    merchantEmail: string,
    merchantName: string,
    documentName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 15px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Document Verified ✅</h2>
          </div>
          <div class="content">
            <h3>Hi ${merchantName},</h3>
            <p>Your <strong>${documentName}</strong> has been verified successfully.</p>
            <p>Thank you for providing valid documentation.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `${documentName} Verified`,
      html
    });
  }

  /**
   * Send document rejected email
   */
  static async sendDocumentRejected(
    merchantEmail: string,
    merchantName: string,
    documentName: string,
    reason: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 15px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Document Needs Correction</h2>
          </div>
          <div class="content">
            <h3>Hi ${merchantName},</h3>
            <p>Your <strong>${documentName}</strong> could not be verified.</p>
            <div class="warning-box">
              <h4>Reason:</h4>
              <p>${reason}</p>
            </div>
            <p>Please upload a corrected version of this document.</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/onboarding" class="button">Upload Document</a>
            </p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `${documentName} Needs Correction`,
      html
    });
  }

  /**
   * Send additional documents request email
   */
  static async sendAdditionalDocumentsRequest(
    merchantEmail: string,
    merchantName: string,
    documentTypes: string[],
    message: string
  ): Promise<void> {
    const documentList = documentTypes.map(type => `<li>${type.replace(/_/g, ' ').toUpperCase()}</li>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Additional Documents Required 📄</h1>
          </div>
          <div class="content">
            <h2>Hi ${merchantName},</h2>
            <p>To complete your verification, we need the following additional documents:</p>
            <ul>
              ${documentList}
            </ul>
            <div class="info-box">
              <h3>Message from our team:</h3>
              <p>${message}</p>
            </div>
            <p>Please upload these documents at your earliest convenience.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/merchant/onboarding" class="button">Upload Documents</a>
            </p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>Your Store Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Additional Documents Required for Verification',
      html,
      text: `Hi ${merchantName},\n\nWe need additional documents: ${documentTypes.join(', ')}.\n\n${message}`
    });
  }

  /**
   * Send admin notification about new onboarding submission
   */
  static async sendAdminOnboardingNotification(
    adminEmail: string,
    businessName: string,
    merchantId: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #673AB7; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .merchant-box { background: white; border: 2px solid #673AB7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #673AB7; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Onboarding Submission</h1>
          </div>
          <div class="content">
            <h2>Admin Notification</h2>
            <p>A new merchant has submitted their onboarding application for review.</p>
            <div class="merchant-box">
              <p><strong>Business Name:</strong> ${businessName}</p>
              <p><strong>Merchant ID:</strong> ${merchantId}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>Please review the application and verify the submitted documents.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/onboarding/${merchantId}" class="button">Review Application</a>
            </p>
            <p>This is an automated notification.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store Admin System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: adminEmail,
      subject: `New Merchant Onboarding - ${businessName}`,
      html,
      text: `New merchant onboarding submission from ${businessName} (ID: ${merchantId})`
    });
  }

  /**
   * Send OTP to user for authentication
   */
  static async sendUserOTP(
    userEmail: string,
    userName: string,
    otp: string,
    phoneNumber: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-box { background: white; border: 3px solid #667eea; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 20px 0; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Your Verification Code</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName || 'there'},</h2>
            <p>Your one-time password (OTP) for phone number <strong>${phoneNumber}</strong> is:</p>
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">VERIFICATION CODE</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; color: #999; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            <div class="warning-box">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>Never share this code with anyone</li>
                <li>This code will expire in 10 minutes</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            <p>If you have any questions or concerns, please contact our support team.</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `${otp} is your ${BRAND.APP_NAME} verification code`,
      html,
      text: `Your OTP is: ${otp}\n\nThis code will expire in 10 minutes.\n\nNever share this code with anyone.`,
    });
  }

  /**
   * Send order confirmation email to user
   */
  static async sendOrderConfirmation(
    userEmail: string,
    userName: string,
    orderDetails: {
      orderId: string;
      orderNumber: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      subtotal: number;
      deliveryFee: number;
      total: number;
      estimatedDelivery?: string;
      storeName: string;
      deliveryAddress: string;
    }
  ): Promise<void> {
    const itemsList = orderDetails.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
          </tr>`
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-box { background: white; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .order-details { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .total-row { font-weight: bold; font-size: 18px; background: #f0f0f0; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Confirmed!</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Thank you for your order</p>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your order has been successfully placed and is being prepared!</p>
            <div class="order-box">
              <h3 style="margin-top: 0; color: #4CAF50;">Order #${orderDetails.orderNumber}</h3>
              <p><strong>Store:</strong> ${orderDetails.storeName}</p>
              <p><strong>Delivery Address:</strong> ${orderDetails.deliveryAddress}</p>
              ${orderDetails.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${orderDetails.estimatedDelivery}</p>` : ''}

              <h4>Order Items:</h4>
              <table class="order-details">
                ${itemsList}
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">Subtotal</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${orderDetails.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">Delivery Fee</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${orderDetails.deliveryFee.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td style="padding: 15px;">Total</td>
                  <td style="padding: 15px; text-align: right;">₹${orderDetails.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/tracking/${orderDetails.orderId}" class="button">Track Your Order</a>
            </p>
            <p>You'll receive updates about your order status via email and in-app notifications.</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>Order ID: ${orderDetails.orderId}</p>
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `Order Confirmed - #${orderDetails.orderNumber}`,
      html,
      text: `Hi ${userName},\n\nYour order #${orderDetails.orderNumber} has been confirmed!\n\nTotal: ₹${orderDetails.total}\n\nTrack your order: ${process.env.FRONTEND_URL}/tracking/${orderDetails.orderId}`,
    });
  }

  /**
   * Send order status update email to user
   */
  static async sendOrderStatusUpdate(
    userEmail: string,
    userName: string,
    orderDetails: {
      orderId: string;
      orderNumber: string;
      status: string;
      statusMessage: string;
      storeName: string;
      estimatedDelivery?: string;
    }
  ): Promise<void> {
    const statusColors: { [key: string]: string } = {
      confirmed: '#2196F3',
      preparing: '#FF9800',
      ready: '#9C27B0',
      'out-for-delivery': '#00BCD4',
      delivered: '#4CAF50',
      cancelled: '#F44336',
    };

    const statusColor = statusColors[orderDetails.status] || '#2196F3';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .status-box { background: white; border: 3px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .status-text { font-size: 24px; font-weight: bold; color: ${statusColor}; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Order Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your order from <strong>${orderDetails.storeName}</strong> has been updated!</p>
            <div class="status-box">
              <p style="margin: 0; color: #666; font-size: 14px;">ORDER STATUS</p>
              <div class="status-text">${orderDetails.status.toUpperCase().replace(/-/g, ' ')}</div>
              <p style="margin: 10px 0 0 0; color: #666;">${orderDetails.statusMessage}</p>
            </div>
            <p><strong>Order Number:</strong> #${orderDetails.orderNumber}</p>
            ${orderDetails.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${orderDetails.estimatedDelivery}</p>` : ''}
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/tracking/${orderDetails.orderId}" class="button">Track Order</a>
            </p>
            <p>We'll keep you updated on your order status.</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>Order ID: ${orderDetails.orderId}</p>
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `Order Update - ${orderDetails.status.replace(/-/g, ' ').toUpperCase()} - #${orderDetails.orderNumber}`,
      html,
      text: `Hi ${userName},\n\nYour order #${orderDetails.orderNumber} status: ${orderDetails.status}\n\n${orderDetails.statusMessage}\n\nTrack: ${process.env.FRONTEND_URL}/tracking/${orderDetails.orderId}`,
    });
  }

  /**
   * Send welcome email to new user
   */
  static async sendUserWelcomeEmail(
    userEmail: string,
    userName: string,
    referralCode?: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .welcome-box { background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .feature { margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 5px; }
          .referral-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .referral-code { font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; }
          .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${BRAND.APP_NAME}!</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Start earning cashback on every purchase</p>
          </div>
          <div class="content">
            <h2>Hi ${userName}! 👋</h2>
            <p>Thank you for joining ${BRAND.APP_NAME}! We're excited to have you in our community.</p>

            <div class="welcome-box">
              <h3 style="margin-top: 0; color: #667eea;">🚀 Get Started</h3>
              <div class="feature">
                <strong>💰 Earn Cashback</strong><br>
                Get 2-15% cashback on every purchase from our partner stores
              </div>
              <div class="feature">
                <strong>🎮 Play & Win</strong><br>
                Complete challenges and games to earn bonus rewards
              </div>
              <div class="feature">
                <strong>👥 Refer Friends</strong><br>
                Invite friends and earn rewards when they make their first purchase
              </div>
              <div class="feature">
                <strong>🏆 Level Up</strong><br>
                Upgrade to Premium or VIP for exclusive benefits and higher cashback
              </div>
            </div>

            ${referralCode ? `
            <div class="referral-box">
              <h3 style="margin-top: 0;">Your Referral Code</h3>
              <div class="referral-code">${referralCode}</div>
              <p style="margin: 10px 0 0 0;">Share this code with friends and earn ₹100 when they make their first order!</p>
            </div>
            ` : ''}

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" class="button">Start Shopping</a>
            </p>

            <p><strong>Need help?</strong> Check out our help center or contact support anytime.</p>
            <p>Happy shopping and earning!</p>
            <p>Best regards,<br>The ${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
            <p><a href="${process.env.FRONTEND_URL}/help" style="color: #667eea;">Help Center</a> | <a href="${process.env.FRONTEND_URL}/account/settings" style="color: #667eea;">Account Settings</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `🎉 Welcome to ${BRAND.APP_NAME} - Start Earning Cashback Today!`,
      html,
      text: `Hi ${userName}!\n\nWelcome to ${BRAND.APP_NAME}! 🎉\n\nStart earning cashback on every purchase, play games, and refer friends for rewards.\n\n${referralCode ? `Your referral code: ${referralCode}\n\n` : ''}Visit ${process.env.FRONTEND_URL} to get started!`,
    });
  }

  /**
   * Send password reset email to user
   */
  static async sendUserPasswordReset(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 15px 40px; background: #FF5722; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your ${BRAND.APP_NAME} password.</p>
            <p>Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
                <li>Never share your password or this link with anyone</li>
              </ul>
            </div>
            <p>If you're having trouble, contact our support team for assistance.</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Security Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `Reset Your ${BRAND.APP_NAME} Password`,
      html,
      text: `Hi ${userName},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    });
  }

  /**
   * Send cashback earned notification
   */
  static async sendCashbackNotification(
    userEmail: string,
    userName: string,
    cashbackDetails: {
      amount: number;
      orderNumber: string;
      storeName: string;
      totalBalance: number;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .cashback-box { background: white; border: 3px solid #FFD700; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .amount { font-size: 42px; font-weight: bold; color: #FFA500; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Cashback Earned!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Great news! You've earned cashback on your recent purchase!</p>
            <div class="cashback-box">
              <p style="margin: 0; color: #666; font-size: 14px;">CASHBACK EARNED</p>
              <div class="amount">₹${cashbackDetails.amount.toFixed(2)}</div>
              <p style="margin: 5px 0 0 0; color: #666;">Order #${cashbackDetails.orderNumber}</p>
              <p style="margin: 5px 0 0 0; color: #666;">from ${cashbackDetails.storeName}</p>
            </div>
            <p><strong>Your Total Cashback Balance:</strong> ₹${cashbackDetails.totalBalance.toFixed(2)}</p>
            <p>Your cashback has been added to your wallet and is ready to use on your next purchase!</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/wallet" class="button">View Wallet</a>
            </p>
            <p>Keep shopping to earn more cashback! Upgrade to Premium for 2x cashback or VIP for 3x cashback.</p>
            <p>Happy shopping!</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `🎉 You earned ₹${cashbackDetails.amount} cashback!`,
      html,
      text: `Hi ${userName},\n\nYou earned ₹${cashbackDetails.amount} cashback on order #${cashbackDetails.orderNumber}!\n\nTotal balance: ₹${cashbackDetails.totalBalance}\n\nView your wallet: ${process.env.FRONTEND_URL}/wallet`,
    });
  }

  /**
   * Send referral reward notification
   */
  static async sendReferralReward(
    userEmail: string,
    userName: string,
    rewardDetails: {
      amount: number;
      friendName: string;
      totalReferrals: number;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .reward-box { background: white; border: 3px solid #667eea; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .amount { font-size: 42px; font-weight: bold; color: #667eea; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .stats-box { background: #f0f0f0; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Referral Reward Earned!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Awesome news! Your friend <strong>${rewardDetails.friendName}</strong> just made their first purchase using your referral code!</p>
            <div class="reward-box">
              <p style="margin: 0; color: #666; font-size: 14px;">REFERRAL REWARD</p>
              <div class="amount">₹${rewardDetails.amount.toFixed(2)}</div>
              <p style="margin: 5px 0 0 0; color: #666;">Added to your wallet</p>
            </div>
            <div class="stats-box">
              <h3 style="margin-top: 0;">Your Referral Stats</h3>
              <p><strong>Total Successful Referrals:</strong> ${rewardDetails.totalReferrals}</p>
              <p><strong>Keep sharing to earn more!</strong> You earn ₹100 for each friend who makes their first purchase.</p>
            </div>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/referral" class="button">Share Your Code</a>
            </p>
            <p>The more friends you invite, the more you earn! There's no limit to your referral rewards.</p>
            <p>Thank you for spreading the word about ${BRAND.APP_NAME}!</p>
            <p>Best regards,<br>${BRAND.APP_NAME} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: userEmail,
      subject: `🎊 You earned ₹${rewardDetails.amount} for referring ${rewardDetails.friendName}!`,
      html,
      text: `Hi ${userName},\n\nYour friend ${rewardDetails.friendName} made their first purchase!\n\nYou earned ₹${rewardDetails.amount} referral reward.\n\nTotal referrals: ${rewardDetails.totalReferrals}\n\nKeep sharing: ${process.env.FRONTEND_URL}/referral`,
    });
  }

  /**
   * Send refund confirmation email
   */
  static async sendRefundConfirmation(
    email: string,
    userName: string,
    refundDetails: {
      orderNumber: string;
      refundAmount: number;
      refundType: 'full' | 'partial';
      refundMethod: string;
      estimatedArrival: string;
      refundId: string;
      reason?: string;
    }
  ): Promise<void> {
    const subject = `Refund Processed for Order ${refundDetails.orderNumber}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">💰 Refund Processed</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hi ${userName},</p>
          
          <p>Your refund request for <strong>Order ${refundDetails.orderNumber}</strong> has been processed successfully.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">Refund Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Refund Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><strong style="color: #667eea; font-size: 18px;">₹${refundDetails.refundAmount.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Refund Type:</td>
                <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${refundDetails.refundType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Payment Method:</td>
                <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${refundDetails.refundMethod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Refund ID:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${refundDetails.refundId}</td>
              </tr>
              ${refundDetails.reason ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Reason:</td>
                <td style="padding: 8px 0; text-align: right;">${refundDetails.reason}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>⏰ Estimated Arrival:</strong> ${refundDetails.estimatedArrival}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404;">
              ${refundDetails.refundMethod === 'wallet' 
                ? 'The refund has been credited to your wallet instantly.' 
                : refundDetails.refundMethod === 'razorpay' || refundDetails.refundMethod === 'stripe'
                ? 'The refund will be processed within 5-7 business days to your original payment method.'
                : 'Please allow 3-5 business days for the refund to be processed.'}
            </p>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions about this refund, please contact our support team.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <a href="${process.env.FRONTEND_URL || 'https://yourstore.com'}/orders" 
               style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} ${BRAND.APP_NAME}. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${userName},\n\nYour refund request for Order ${refundDetails.orderNumber} has been processed successfully.\n\nRefund Amount: ₹${refundDetails.refundAmount.toFixed(2)}\nRefund Type: ${refundDetails.refundType}\nPayment Method: ${refundDetails.refundMethod}\nRefund ID: ${refundDetails.refundId}\nEstimated Arrival: ${refundDetails.estimatedArrival}\n\n${refundDetails.refundMethod === 'wallet' 
      ? 'The refund has been credited to your wallet instantly.' 
      : 'The refund will be processed within 5-7 business days to your original payment method.'}\n\nIf you have any questions, please contact our support team.\n\nView your orders: ${process.env.FRONTEND_URL || 'https://yourstore.com'}/orders`;

    await this.send({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send refund request notification to merchant
   */
  static async sendRefundRequestNotification(
    merchantEmail: string,
    storeName: string,
    refundDetails: {
      orderNumber: string;
      refundAmount: number;
      refundType: string;
      refundReason: string;
      customerName: string;
      refundId: string;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .refund-box { background: white; border: 2px solid #FF9800; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Refund Request Received</h1>
          </div>
          <div class="content">
            <h2>Hi ${storeName},</h2>
            <p>A customer has requested a refund for an order. Please review and process the refund request.</p>
            <div class="refund-box">
              <p><strong>Order Number:</strong> ${refundDetails.orderNumber}</p>
              <p><strong>Customer:</strong> ${refundDetails.customerName}</p>
              <p><strong>Refund Amount:</strong> ₹${refundDetails.refundAmount.toFixed(2)}</p>
              <p><strong>Refund Type:</strong> ${refundDetails.refundType}</p>
              <p><strong>Reason:</strong> ${refundDetails.refundReason}</p>
              <p><strong>Refund ID:</strong> ${refundDetails.refundId}</p>
            </div>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL}/merchant/orders/${refundDetails.orderNumber}" class="button">Review Refund Request</a>
            </p>
            <p>Please process this refund request within 24-48 hours.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} REZ App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: merchantEmail,
      subject: `Refund Request - Order ${refundDetails.orderNumber}`,
      html,
      text: `Refund request received for Order ${refundDetails.orderNumber}. Amount: ₹${refundDetails.refundAmount.toFixed(2)}. Reason: ${refundDetails.refundReason}`
    });
  }

  /**
   * Send refund request notification to admin
   */
  static async sendAdminRefundRequestNotification(
    adminEmail: string,
    refundDetails: {
      orderNumber: string;
      refundAmount: number;
      refundType: string;
      refundReason: string;
      customerName: string;
      refundId: string;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .refund-box { background: white; border: 2px solid #F44336; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #F44336; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Admin: Refund Request Notification</h1>
          </div>
          <div class="content">
            <h2>Admin Notification</h2>
            <p>A new refund request has been submitted and requires review.</p>
            <div class="refund-box">
              <p><strong>Order Number:</strong> ${refundDetails.orderNumber}</p>
              <p><strong>Customer:</strong> ${refundDetails.customerName}</p>
              <p><strong>Refund Amount:</strong> ₹${refundDetails.refundAmount.toFixed(2)}</p>
              <p><strong>Refund Type:</strong> ${refundDetails.refundType}</p>
              <p><strong>Reason:</strong> ${refundDetails.refundReason}</p>
              <p><strong>Refund ID:</strong> ${refundDetails.refundId}</p>
            </div>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/refunds/${refundDetails.refundId}" class="button">Review Refund Request</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} REZ App Admin. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: adminEmail,
      subject: `[Admin] Refund Request - Order ${refundDetails.orderNumber}`,
      html,
      text: `Admin notification: Refund request for Order ${refundDetails.orderNumber}. Amount: ₹${refundDetails.refundAmount.toFixed(2)}`
    });
  }

  /**
   * Check if email service is configured
   */
  static isConfigured(): boolean {
    return isValidSendGridKey;
  }
}

export default EmailService;
