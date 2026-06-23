// Share Service
// Handles profile sharing functionality

import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface ShareProfileOptions {
  userId: string;
  userName: string;
  userBio?: string;
}

interface ShareResult {
  success: boolean;
  action?: string;
  error?: string;
}

export class ShareService {
  private static readonly APP_DEEP_LINK = 'rez://profile/';
  private static readonly WEB_BASE_URL = 'https://www.rezapp.com/profile/';

  /**
   * Generate shareable profile URL
   */
  static generateProfileUrl(userId: string): string {
    // Use deep link for mobile, web URL for sharing
    return `${this.WEB_BASE_URL}${userId}`;
  }

  /**
   * Generate profile message for sharing
   */
  static generateShareMessage(options: ShareProfileOptions): string {
    const { userName, userBio } = options;
    const profileUrl = this.generateProfileUrl(options.userId);

    let message = `Check out ${userName}'s profile on REZ App!\n\n`;

    if (userBio) {
      message += `"${userBio}"\n\n`;
    }

    message += `View Profile: ${profileUrl}`;

    return message;
  }

  /**
   * Share profile using native share dialog
   */
  static async shareProfile(options: ShareProfileOptions): Promise<ShareResult> {
    try {
      const message = this.generateShareMessage(options);

      const result = await Share.share(
        {
          message,
          title: `${options.userName}'s Profile - REZ App`,
          url: this.generateProfileUrl(options.userId),
        },
        {
          dialogTitle: 'Share Profile',
          subject: `Check out ${options.userName} on REZ App`,
        }
      );

      if (result.action === Share.sharedAction) {
        return {
          success: true,
          action: result.activityType || 'shared',
        };
      } else if (result.action === Share.dismissedAction) {
        return {
          success: false,
          action: 'dismissed',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share profile',
      };
    }
  }

  /**
   * Copy profile link to clipboard
   */
  static async copyProfileLink(userId: string): Promise<ShareResult> {
    try {
      const profileUrl = this.generateProfileUrl(userId);
      await Clipboard.setStringAsync(profileUrl);

      return {
        success: true,
        action: 'copied',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to copy link',
      };
    }
  }

  /**
   * Share profile via WhatsApp
   */
  static async shareViaWhatsApp(options: ShareProfileOptions): Promise<ShareResult> {
    try {
      const message = this.generateShareMessage(options);
      const encodedMessage = encodeURIComponent(message);

      // WhatsApp URL scheme
      const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;

      // Note: This requires Linking from React Native to be implemented in the calling component
      return {
        success: true,
        action: 'whatsapp',
        error: whatsappUrl, // Passing URL as error field for the component to use
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to share via WhatsApp',
      };
    }
  }

  /**
   * Generate QR code data for profile
   */
  static generateQRCodeData(userId: string): string {
    return this.generateProfileUrl(userId);
  }

  /**
   * Share profile as text
   */
  static async shareAsText(options: ShareProfileOptions): Promise<ShareResult> {
    try {
      const message = this.generateShareMessage(options);

      const result = await Share.share({
        message,
      });

      return {
        success: result.action === Share.sharedAction,
        action: result.action,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to share profile',
      };
    }
  }
}
