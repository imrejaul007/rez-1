import { logger } from '../config/logger';
import crypto from 'crypto';
import { MerchantUser, IMerchantUser, MerchantUserRole } from '../models/MerchantUser';
import { Merchant } from '../models/Merchant';
import EmailService from './EmailService';
import { getPermissionsForRole } from '../config/permissions';
import { Lean } from '../types/lean';

export interface InvitationData {
  email: string;
  name: string;
  role: MerchantUserRole;
  merchantId: string;
  invitedBy: string;
}

export interface InvitationResult {
  success: boolean;
  message: string;
  invitationId?: string;
  invitationToken?: string;
  expiresAt?: Date;
}

export class TeamInvitationService {
  // Invitation token expiry (24 hours)
  private static readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * Generate a unique invitation token
   */
  private static generateInvitationToken(): {
    token: string;
    hashedToken: string;
    expiry: Date;
  } {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiry = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    return { token, hashedToken, expiry };
  }

  /**
   * Create a new team invitation
   */
  static async createInvitation(data: InvitationData): Promise<InvitationResult> {
    try {
      const { email, name, role, merchantId, invitedBy } = data;

      // Validate role
      if (!['admin', 'manager', 'staff'].includes(role)) {
        return {
          success: false,
          message: 'Invalid role. Can only invite admin, manager, or staff.'
        };
      }

      // Check if merchant exists
      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        return {
          success: false,
          message: 'Merchant not found'
        };
      }

      // Check if user already exists for this merchant
      const existingUser = await MerchantUser.findOne({
        merchantId,
        email: email.toLowerCase()
      }).lean();

      if (existingUser) {
        if (existingUser.status === 'active') {
          return {
            success: false,
            message: 'A team member with this email already exists'
          };
        } else if (existingUser.status === 'inactive') {
          // User was invited but hasn't accepted yet - allow resend
          return await this.resendInvitation(existingUser._id.toString());
        }
      }

      // Generate invitation token
      const { token, hashedToken, expiry } = this.generateInvitationToken();

      // Get default permissions for role
      const permissions = getPermissionsForRole(role);

      // Create merchant user record
      const merchantUser = new MerchantUser({
        merchantId,
        email: email.toLowerCase(),
        name,
        role,
        permissions,
        status: 'inactive', // Will become active when invitation is accepted
        invitedBy,
        invitedAt: new Date(),
        invitationToken: hashedToken,
        invitationExpiry: expiry
      });

      await merchantUser.save();

      // Send invitation email
      try {
        await this.sendInvitationEmail(
          email,
          name,
          merchant.businessName,
          role,
          token
        );
      } catch (emailError) {
        logger.error('Failed to send invitation email:', emailError);
        // Don't fail the invitation if email fails
      }

      logger.info(`✅ Team invitation created: ${email} as ${role} for merchant ${merchantId}`);

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitationId: merchantUser._id.toString(),
        invitationToken: process.env.NODE_ENV === 'development' ? token : undefined,
        expiresAt: expiry
      };
    } catch (error: any) {
      logger.error('Error creating invitation:', error);
      return {
        success: false,
        message: `Failed to create invitation: ${error.message}`
      };
    }
  }

  /**
   * Resend an existing invitation
   */
  static async resendInvitation(merchantUserId: string): Promise<InvitationResult> {
    try {
      const merchantUser = await MerchantUser.findById(merchantUserId);

      if (!merchantUser) {
        return {
          success: false,
          message: 'Invitation not found'
        };
      }

      if (merchantUser.status === 'active') {
        return {
          success: false,
          message: 'User has already accepted the invitation'
        };
      }

      // Generate new invitation token
      const { token, hashedToken, expiry } = this.generateInvitationToken();

      // Update merchant user with new token
      merchantUser.invitationToken = hashedToken;
      merchantUser.invitationExpiry = expiry;
      merchantUser.invitedAt = new Date(); // Update invitation time
      await merchantUser.save();

      // Get merchant details
      const merchant = await Merchant.findById(merchantUser.merchantId).lean();
      if (!merchant) {
        return {
          success: false,
          message: 'Merchant not found'
        };
      }

      // Resend invitation email
      try {
        await this.sendInvitationEmail(
          merchantUser.email,
          merchantUser.name,
          merchant.businessName,
          merchantUser.role,
          token
        );
      } catch (emailError) {
        logger.error('Failed to resend invitation email:', emailError);
      }

      logger.info(`✅ Team invitation resent: ${merchantUser.email}`);

      return {
        success: true,
        message: 'Invitation resent successfully',
        invitationId: merchantUser._id.toString(),
        invitationToken: process.env.NODE_ENV === 'development' ? token : undefined,
        expiresAt: expiry
      };
    } catch (error: any) {
      logger.error('Error resending invitation:', error);
      return {
        success: false,
        message: `Failed to resend invitation: ${error.message}`
      };
    }
  }

  /**
   * Accept an invitation and set password
   */
  static async acceptInvitation(
    token: string,
    password: string
  ): Promise<{ success: boolean; message: string; merchantUser?: Lean<IMerchantUser> }> {
    try {
      // Hash the token to find the invitation
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find merchant user with valid invitation token
      const merchantUser = await MerchantUser.findOne({
        invitationToken: hashedToken,
        invitationExpiry: { $gt: new Date() },
        status: 'inactive'
      }).select('+invitationToken +invitationExpiry').lean();

      if (!merchantUser) {
        return {
          success: false,
          message: 'Invalid or expired invitation token'
        };
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update merchant user
      merchantUser.password = hashedPassword;
      merchantUser.status = 'active';
      merchantUser.acceptedAt = new Date();
      merchantUser.invitationToken = undefined;
      merchantUser.invitationExpiry = undefined;
      await merchantUser.save();

      logger.info(`✅ Invitation accepted: ${merchantUser.email}`);

      return {
        success: true,
        message: 'Invitation accepted successfully',
        merchantUser
      };
    } catch (error: any) {
      logger.error('Error accepting invitation:', error);
      return {
        success: false,
        message: `Failed to accept invitation: ${error.message}`
      };
    }
  }

  /**
   * Validate invitation token
   */
  static async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    merchantUser?: Lean<IMerchantUser>;
    message?: string;
  }> {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const merchantUser = await MerchantUser.findOne({
        invitationToken: hashedToken,
        invitationExpiry: { $gt: new Date() },
        status: 'inactive'
      }).select('+invitationToken +invitationExpiry').lean();

      if (!merchantUser) {
        return {
          valid: false,
          message: 'Invalid or expired invitation token'
        };
      }

      return {
        valid: true,
        merchantUser
      };
    } catch (error: any) {
      logger.error('Error validating invitation token:', error);
      return {
        valid: false,
        message: 'Error validating token'
      };
    }
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(merchantUserId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const merchantUser = await MerchantUser.findById(merchantUserId).lean();

      if (!merchantUser) {
        return {
          success: false,
          message: 'Invitation not found'
        };
      }

      if (merchantUser.status === 'active') {
        return {
          success: false,
          message: 'Cannot cancel: User has already accepted the invitation'
        };
      }

      // Delete the invitation
      await MerchantUser.deleteOne({ _id: merchantUserId });

      logger.info(`✅ Invitation cancelled: ${merchantUser.email}`);

      return {
        success: true,
        message: 'Invitation cancelled successfully'
      };
    } catch (error: any) {
      logger.error('Error cancelling invitation:', error);
      return {
        success: false,
        message: `Failed to cancel invitation: ${error.message}`
      };
    }
  }

  /**
   * Send invitation email
   */
  private static async sendInvitationEmail(
    email: string,
    name: string,
    businessName: string,
    role: MerchantUserRole,
    token: string
  ): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/team/accept-invitation/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .role-badge { display: inline-block; padding: 8px 16px; background: #10B981; color: white; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          .button { display: inline-block; padding: 14px 32px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #EEF2FF; border-left: 4px solid #6366F1; padding: 15px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited to Join ${businessName}!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>You've been invited to join <strong>${businessName}</strong> as a team member.</p>

            <div class="info-box">
              <p><strong>Your Role:</strong> <span class="role-badge">${role}</span></p>
              <p><strong>Business:</strong> ${businessName}</p>
            </div>

            <p>As a <strong>${role}</strong>, you'll be able to:</p>
            ${this.getRolePermissionsHtml(role)}

            <p>Click the button below to accept the invitation and set your password:</p>
            <p style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </p>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${invitationUrl}</p>

            <p><strong>⏰ This invitation will expire in 24 hours.</strong></p>

            <p>If you didn't expect this invitation, you can safely ignore this email.</p>

            <p>Best regards,<br>${businessName} Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Store Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await EmailService.send({
      to: email,
      subject: `Invitation to join ${businessName} as ${role}`,
      html,
      text: `Hi ${name},\n\nYou've been invited to join ${businessName} as a ${role}.\n\nAccept invitation: ${invitationUrl}\n\nThis link expires in 24 hours.`
    });
  }

  /**
   * Get HTML list of role permissions
   */
  private static getRolePermissionsHtml(role: MerchantUserRole): string {
    const permissions: Record<MerchantUserRole, string[]> = {
      owner: [
        'Full access to all features',
        'Manage billing and subscription',
        'Delete account',
        'Manage team members'
      ],
      admin: [
        'Manage products (create, edit, delete)',
        'Manage orders and refunds',
        'Invite and manage team members',
        'View analytics and reports',
        'Manage store settings'
      ],
      manager: [
        'Create and edit products',
        'Manage orders',
        'View analytics',
        'Update inventory'
      ],
      staff: [
        'View products and inventory',
        'View orders',
        'Update order status',
        'View customer information'
      ]
    };

    const rolePermissions = permissions[role] || [];
    return '<ul>' + rolePermissions.map(p => `<li>${p}</li>`).join('') + '</ul>';
  }

  /**
   * Clean up expired invitations (should be run periodically)
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await MerchantUser.deleteMany({
        status: 'inactive',
        invitationExpiry: { $lt: new Date() }
      });

      const count = result.deletedCount || 0;
      if (count > 0) {
        logger.info(`🧹 Cleaned up ${count} expired invitations`);
      }

      return count;
    } catch (error: any) {
      logger.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  }
}

export default TeamInvitationService;
