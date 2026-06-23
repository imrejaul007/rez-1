import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { SHARE_TEMPLATES, ShareTemplate } from '../types/referral.types';

export class ShareContentGenerator {
  /**
   * Generate personalized share message
   */
  generateMessage(
    template: ShareTemplate,
    referralCode: string,
    referralLink: string,
    userName?: string
  ): string {
    let message = template.message;

    message = message.replace(/{CODE}/g, referralCode);
    message = message.replace(/{LINK}/g, referralLink);
    message = message.replace(/{NAME}/g, userName || 'friend');

    return message;
  }

  /**
   * Share via specific platform
   */
  async shareViaPlatform(
    platform: ShareTemplate['type'],
    referralCode: string,
    referralLink: string,
    userName?: string
  ): Promise<boolean> {
    const template = SHARE_TEMPLATES.find(t => t.type === platform);

    if (!template) {
      throw new Error(`Template not found for platform: ${platform}`);
    }

    const message = this.generateMessage(template, referralCode, referralLink, userName);

    switch (platform) {
      case 'whatsapp':
        return await this.shareViaWhatsApp(message);

      case 'facebook':
        return await this.shareViaFacebook(message, referralLink);

      case 'twitter':
        return await this.shareViaTwitter(message);

      case 'instagram':
        return await this.shareViaInstagram(message);

      case 'telegram':
        return await this.shareViaTelegram(message);

      case 'sms':
        return await this.shareViaSMS(message);

      case 'email':
        return await this.shareViaEmail(message, template.subject!, referralCode);

      default:
        return await this.shareViaGeneric(message);
    }
  }

  /**
   * Share via WhatsApp
   */
  private async shareViaWhatsApp(message: string): Promise<boolean> {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to generic share
        return await this.shareViaGeneric(message);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Facebook
   */
  private async shareViaFacebook(message: string, link: string): Promise<boolean> {
    const url = `fb://facewebmodal/f?href=${encodeURIComponent(link)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to generic share
        return await this.shareViaGeneric(message);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Twitter
   */
  private async shareViaTwitter(message: string): Promise<boolean> {
    const url = `twitter://post?message=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web Twitter
        const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Instagram (Story)
   */
  private async shareViaInstagram(message: string): Promise<boolean> {
    // Instagram doesn't support direct text sharing
    // User needs to copy message and paste manually
    return await this.shareViaGeneric(message);
  }

  /**
   * Share via Telegram
   */
  private async shareViaTelegram(message: string): Promise<boolean> {
    const url = `tg://msg?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web Telegram
        const webUrl = `https://t.me/share/url?url=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via SMS
   */
  private async shareViaSMS(message: string): Promise<boolean> {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${separator}body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Email
   */
  private async shareViaEmail(message: string, subject: string, code: string): Promise<boolean> {
    const finalSubject = subject.replace(/{CODE}/g, code);
    const url = `mailto:?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic share (uses native share sheet)
   */
  private async shareViaGeneric(message: string): Promise<boolean> {
    try {
      const result = await Share.share({
        message
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate shareable image data
   */
  generateShareableImage(
    referralCode: string,
    tierName: string,
    userName: string
  ): {
    text: string;
    backgroundColor: string;
    textColor: string;
  } {
    return {
      text: `Join me on REZ!\n\nUse code: ${referralCode}\n\nGet ₹30 off your first order\n\n- ${userName}\n${tierName} Member`,
      backgroundColor: '#7c3aed',
      textColor: '#ffffff'
    };
  }

  /**
   * Get all share templates
   */
  getAllTemplates(): ShareTemplate[] {
    return SHARE_TEMPLATES;
  }

  /**
   * Get template by type
   */
  getTemplate(type: ShareTemplate['type']): ShareTemplate | undefined {
    return SHARE_TEMPLATES.find(t => t.type === type);
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const SHARE_CONTENT_GENERATOR_KEY = '__rezShareContentGenerator__';

function getShareContentGenerator(): ShareContentGenerator {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[SHARE_CONTENT_GENERATOR_KEY]) {
      (globalThis as any)[SHARE_CONTENT_GENERATOR_KEY] = new ShareContentGenerator();
    }
    return (globalThis as any)[SHARE_CONTENT_GENERATOR_KEY];
  }
  return new ShareContentGenerator();
}

export default getShareContentGenerator();
