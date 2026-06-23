// Wishlist Sharing API Service
// Handles wishlist sharing, deep links, and public wishlist views

import apiClient, { ApiResponse } from './apiClient';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

export interface ShareableLink {
  shareCode: string;
  shareUrl: string;
  deepLink: string;
  qrCodeData: string;
  expiresAt?: string;
}

export interface PublicWishlist {
  id: string;
  name: string;
  description?: string;
  shareCode: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  items: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    productId: string;
    category: string;
    rating?: number;
    reserved?: boolean; // If someone marked as "buying this"
  }>;
  itemCount: number;
  totalValue: number;
  privacy: 'public' | 'private' | 'friends_only';
  isPublic: boolean;
  likes: number;
  views: number;
  comments: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacySettings {
  visibility: 'public' | 'private' | 'friends_only';
  allowComments: boolean;
  allowGiftReservation: boolean;
  showPrices: boolean;
  notifyOnView: boolean;
  notifyOnLike: boolean;
}

export interface ShareAnalytics {
  totalShares: number;
  totalViews: number;
  totalLikes: number;
  sharesByPlatform: {
    whatsapp: number;
    facebook: number;
    instagram: number;
    twitter: number;
    telegram: number;
    email: number;
    sms: number;
    link: number;
    qrcode: number;
  };
  conversionRate: number;
  popularItems: Array<{
    productId: string;
    name: string;
    views: number;
    addedToWishlist: number;
    purchased: number;
  }>;
  viewsOverTime: Array<{
    date: string;
    views: number;
    shares: number;
  }>;
}

export interface GiftReservation {
  id: string;
  itemId: string;
  itemName: string;
  reservedBy: {
    id: string;
    name: string;
    anonymous: boolean;
  };
  reservedAt: string;
  status: 'reserved' | 'purchased' | 'cancelled';
  message?: string;
}

class WishlistSharingService {
  private static readonly APP_DEEP_LINK = 'rez://wishlist/';
  private static readonly WEB_BASE_URL = 'https://www.rezapp.com/wishlist/';

  /**
   * Generate shareable link for wishlist
   */
  async generateShareableLink(wishlistId: string): Promise<ApiResponse<ShareableLink>> {
    return apiClient.post(`/wishlist/${wishlistId}/generate-share-link`);
  }

  /**
   * Get public wishlist by share code
   */
  async getPublicWishlist(shareCode: string): Promise<ApiResponse<PublicWishlist>> {
    return apiClient.get(`/wishlist/public/${shareCode}`);
  }

  /**
   * Update wishlist privacy settings
   */
  async updatePrivacySettings(
    wishlistId: string,
    settings: PrivacySettings
  ): Promise<ApiResponse<{ message: string; settings: PrivacySettings }>> {
    return apiClient.patch(`/wishlist/${wishlistId}/privacy`, settings);
  }

  /**
   * Get current privacy settings
   */
  async getPrivacySettings(wishlistId: string): Promise<ApiResponse<PrivacySettings>> {
    return apiClient.get(`/wishlist/${wishlistId}/privacy`);
  }

  /**
   * Track share analytics
   */
  async trackShareAnalytics(
    wishlistId: string,
    platform: 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'email' | 'sms' | 'link' | 'qrcode'
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/wishlist/${wishlistId}/track-share`, { platform });
  }

  /**
   * Get share analytics
   */
  async getShareAnalytics(wishlistId: string): Promise<ApiResponse<ShareAnalytics>> {
    return apiClient.get(`/wishlist/${wishlistId}/analytics/shares`);
  }

  /**
   * Get all shared wishlists (wishlists shared by others with me)
   */
  async getSharedWishlists(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    wishlists: PublicWishlist[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    return apiClient.get('/wishlist/shared-with-me', { page, limit });
  }

  /**
   * Like a public wishlist
   */
  async likeWishlist(shareCode: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return apiClient.post(`/wishlist/public/${shareCode}/like`);
  }

  /**
   * Unlike a public wishlist
   */
  async unlikeWishlist(shareCode: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return apiClient.delete(`/wishlist/public/${shareCode}/like`);
  }

  /**
   * Add comment to public wishlist
   */
  async addComment(
    shareCode: string,
    comment: string
  ): Promise<ApiResponse<PublicWishlist['comments'][0]>> {
    return apiClient.post(`/wishlist/public/${shareCode}/comments`, { comment });
  }

  /**
   * Delete comment
   */
  async deleteComment(
    shareCode: string,
    commentId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/wishlist/public/${shareCode}/comments/${commentId}`);
  }

  /**
   * Reserve item as gift (mark as "I'm buying this")
   */
  async reserveGift(
    shareCode: string,
    itemId: string,
    options?: {
      anonymous?: boolean;
      message?: string;
    }
  ): Promise<ApiResponse<GiftReservation>> {
    return apiClient.post(`/wishlist/public/${shareCode}/items/${itemId}/reserve`, options);
  }

  /**
   * Cancel gift reservation
   */
  async cancelGiftReservation(
    shareCode: string,
    itemId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/wishlist/public/${shareCode}/items/${itemId}/reserve`);
  }

  /**
   * Mark gift as purchased
   */
  async markGiftPurchased(
    shareCode: string,
    itemId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/wishlist/public/${shareCode}/items/${itemId}/purchased`);
  }

  /**
   * Get gift reservations for a wishlist
   */
  async getGiftReservations(shareCode: string): Promise<ApiResponse<GiftReservation[]>> {
    return apiClient.get(`/wishlist/public/${shareCode}/reservations`);
  }

  /**
   * Add item from public wishlist to my wishlist
   */
  async addToMyWishlist(
    shareCode: string,
    itemId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/wishlist/public/${shareCode}/items/${itemId}/add-to-mine`);
  }

  /**
   * Report inappropriate wishlist
   */
  async reportWishlist(
    shareCode: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/wishlist/public/${shareCode}/report`, { reason, details });
  }

  // ========== Local Share Functions (No API call) ==========

  /**
   * Generate share URL (local utility)
   */
  generateShareUrl(shareCode: string): string {
    return `${WishlistSharingService.WEB_BASE_URL}${shareCode}`;
  }

  /**
   * Generate deep link (local utility)
   */
  generateDeepLink(shareCode: string): string {
    return `${WishlistSharingService.APP_DEEP_LINK}${shareCode}`;
  }

  /**
   * Generate share message (local utility)
   */
  generateShareMessage(
    wishlistName: string,
    ownerName: string,
    shareUrl: string,
    itemCount: number
  ): string {
    return `Check out "${wishlistName}" by ${ownerName} on REZ App!\n\n${itemCount} amazing items to discover.\n\n${shareUrl}`;
  }

  /**
   * Share wishlist via native share dialog
   */
  async shareViaDialog(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<{ success: boolean; platform?: string }> {
    try {
      const message = this.generateShareMessage(
        options.wishlistName,
        options.ownerName,
        options.shareUrl,
        options.itemCount
      );
      const result = await Share.share(
        {
          message,
          title: `${options.wishlistName} - REZ Wishlist`,
          url: options.shareUrl,
        },
        {
          dialogTitle: 'Share Wishlist',
          subject: `Check out ${options.wishlistName}`,
        }
      );
      if (result.action === Share.sharedAction) {
        return {
          success: true,
          platform: result.activityType || 'shared',
        };
      } else if (result.action === Share.dismissedAction) {
        return {
          success: false,
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Copy link to clipboard
   */
  async copyLinkToClipboard(shareUrl: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(shareUrl);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via WhatsApp
   */
  async shareViaWhatsApp(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      const message = this.generateShareMessage(
        options.wishlistName,
        options.ownerName,
        options.shareUrl,
        options.itemCount
      );
      const encodedMessage = encodeURIComponent(message);
      const url = `whatsapp://send?text=${encodedMessage}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to native share
        const result = await this.shareViaDialog(options);
        return result.success;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Facebook
   */
  async shareViaFacebook(shareUrl: string): Promise<boolean> {
    try {
      const url = `fb://facewebmodal/f?href=${encodeURIComponent(shareUrl)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web
        const webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
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
  async shareViaInstagram(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      // Instagram doesn't support direct link sharing
      // Copy link to clipboard and open Instagram
      await this.copyLinkToClipboard(options.shareUrl);

      const url = 'instagram://story-camera';
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Twitter
   */
  async shareViaTwitter(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      const message = `Check out "${options.wishlistName}" by ${options.ownerName} on REZ App! ${options.itemCount} items`;
      const url = `twitter://post?message=${encodeURIComponent(message)}&url=${encodeURIComponent(options.shareUrl)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web Twitter
        const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(options.shareUrl)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Telegram
   */
  async shareViaTelegram(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      const message = this.generateShareMessage(
        options.wishlistName,
        options.ownerName,
        options.shareUrl,
        options.itemCount
      );
      const url = `tg://msg_url?url=${encodeURIComponent(options.shareUrl)}&text=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Fallback to web Telegram
        const webUrl = `https://t.me/share/url?url=${encodeURIComponent(options.shareUrl)}&text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via Email
   */
  async shareViaEmail(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      const subject = `Check out ${options.wishlistName} on REZ App`;
      const body = this.generateShareMessage(
        options.wishlistName,
        options.ownerName,
        options.shareUrl,
        options.itemCount
      );
      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      await Linking.openURL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Share via SMS
   */
  async shareViaSMS(options: {
    wishlistName: string;
    ownerName: string;
    shareUrl: string;
    itemCount: number;
  }): Promise<boolean> {
    try {
      const message = this.generateShareMessage(
        options.wishlistName,
        options.ownerName,
        options.shareUrl,
        options.itemCount
      );
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${separator}body=${encodeURIComponent(message)}`;

      await Linking.openURL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate QR code data for wishlist
   */
  generateQRCodeData(shareUrl: string): string {
    return shareUrl;
  }
}

// Create singleton instance
const wishlistSharingService = new WishlistSharingService();

export default wishlistSharingService;
