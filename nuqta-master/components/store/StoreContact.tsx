import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Platform,
  Share} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/constants/theme';

export interface StoreContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  workingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

export interface StoreContactProps {
  contact: StoreContactInfo;
  storeName: string;
}

const StoreContact: React.FC<StoreContactProps> = ({ contact, storeName }) => {
  const handlePhonePress = async () => {
    if (!contact.phone) return;

    const phoneNumber = contact.phone.replace(/[^0-9+]/g, '');
    const url = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        platformAlertSimple('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open phone dialer');
    }
  };

  const handleEmailPress = async () => {
    if (!contact.email) return;

    const url = `mailto:${contact.email}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        platformAlertSimple('Error', 'Email is not supported on this device');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open email app');
    }
  };

  const handleWhatsAppPress = async () => {
    if (!contact.whatsapp) return;

    const phoneNumber = contact.whatsapp.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        platformAlertSimple('Error', 'WhatsApp is not installed on this device');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open WhatsApp');
    }
  };

  const handleWebsitePress = async () => {
    if (!contact.website) return;

    let url = contact.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        platformAlertSimple('Error', 'Cannot open website');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open website');
    }
  };

  const handleSocialMediaPress = async (platform: string, url?: string) => {
    if (!url) return;

    let fullUrl = url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }

    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        platformAlertSimple('Error', `Cannot open ${platform}`);
      }
    } catch (error) {
      platformAlertSimple('Error', `Failed to open ${platform}`);
    }
  };

  const handleCopyAddress = async () => {
    if (!contact.address?.fullAddress) return;

    try {
      await Clipboard.setStringAsync(contact.address.fullAddress);
      platformAlertSimple('Success', 'Address copied to clipboard');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy address');
    }
  };

  const handleGetDirections = async () => {
    if (!contact.address) return;

    let url: string;

    if (contact.address.coordinates) {
      const { latitude, longitude } = contact.address.coordinates;
      if (Platform.OS === 'ios') {
        url = `maps://app?daddr=${latitude},${longitude}`;
      } else {
        url = `google.navigation:q=${latitude},${longitude}`;
      }
    } else {
      const address = encodeURIComponent(contact.address.fullAddress);
      if (Platform.OS === 'ios') {
        url = `maps://app?daddr=${address}`;
      } else {
        url = `google.navigation:q=${address}`;
      }
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web maps
        const webUrl = contact.address.coordinates
          ? `https://www.google.com/maps/dir/?api=1&destination=${contact.address.coordinates.latitude},${contact.address.coordinates.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address.fullAddress)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open maps');
    }
  };

  const handleShareContact = async () => {
    try {
      let message = `${storeName}\n\n`;

      if (contact.phone) message += `Phone: ${contact.phone}\n`;
      if (contact.email) message += `Email: ${contact.email}\n`;
      if (contact.website) message += `Website: ${contact.website}\n`;
      if (contact.address) message += `\nAddress: ${contact.address.fullAddress}\n`;

      await Share.share({
        message,
        title: `Contact - ${storeName}`,
      });
    } catch (error) {
      // silently handle
    }
  };

  const formatWorkingHours = () => {
    if (!contact.workingHours) return null;

    const days = [
      { key: 'monday', label: 'Mon' },
      { key: 'tuesday', label: 'Tue' },
      { key: 'wednesday', label: 'Wed' },
      { key: 'thursday', label: 'Thu' },
      { key: 'friday', label: 'Fri' },
      { key: 'saturday', label: 'Sat' },
      { key: 'sunday', label: 'Sun' },
    ];

    return days.map((day) => {
      const hours = contact.workingHours?.[day.key as keyof typeof contact.workingHours];
      if (!hours) return null;

      return (
        <View key={day.key} style={styles.workingHourRow}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <Text style={styles.hoursLabel}>{hours}</Text>
        </View>
      );
    });
  };

  const getSocialIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
    switch (platform) {
      case 'facebook':
        return 'logo-facebook';
      case 'instagram':
        return 'logo-instagram';
      case 'twitter':
        return 'logo-twitter';
      case 'youtube':
        return 'logo-youtube';
      case 'linkedin':
        return 'logo-linkedin';
      default:
        return 'globe';
    }
  };

  const getSocialColor = (platform: string): string => {
    switch (platform) {
      case 'facebook':
        return '#1877F2';
      case 'instagram':
        return '#E4405F';
      case 'twitter':
        return '#1DA1F2';
      case 'youtube':
        return '#FF0000';
      case 'linkedin':
        return '#0A66C2';
      default:
        return colors.brand.purple;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="call" size={24} color={colors.brand.purple} />
        <Text style={styles.headerTitle}>Contact Information</Text>
      </View>

      {/* Phone */}
      {contact.phone && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone</Text>
          <Pressable
            style={styles.contactItem}
            onPress={handlePhonePress}
           
          >
            <View style={styles.iconCircle}>
              <Ionicons name="call" size={20} color={colors.brand.purple} />
            </View>
            <Text style={styles.contactText}>{contact.phone}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        </View>
      )}

      {/* Email */}
      {contact.email && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <Pressable
            style={styles.contactItem}
            onPress={handleEmailPress}
           
          >
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={20} color={colors.brand.purple} />
            </View>
            <Text style={styles.contactText}>{contact.email}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        </View>
      )}

      {/* WhatsApp */}
      {contact.whatsapp && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WhatsApp</Text>
          <Pressable
            style={styles.contactItem}
            onPress={handleWhatsAppPress}
           
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.greenMist }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={styles.contactText}>{contact.whatsapp}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        </View>
      )}

      {/* Website */}
      {contact.website && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Website</Text>
          <Pressable
            style={styles.contactItem}
            onPress={handleWebsitePress}
           
          >
            <View style={styles.iconCircle}>
              <Ionicons name="globe" size={20} color={colors.brand.purple} />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>
              {contact.website}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        </View>
      )}

      {/* Social Media */}
      {contact.socialMedia && Object.keys(contact.socialMedia).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          <View style={styles.socialContainer}>
            {Object.entries(contact.socialMedia).map(([platform, url]) => {
              if (!url) return null;
              return (
                <Pressable
                  key={platform}
                  style={styles.socialButton}
                  onPress={() => handleSocialMediaPress(platform, url)}
                 
                >
                  <Ionicons
                    name={getSocialIcon(platform)}
                    size={24}
                    color={getSocialColor(platform)}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Address */}
      {contact.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Ionicons name="location" size={20} color={colors.brand.purple} />
              <Text style={styles.addressTitle}>Store Location</Text>
            </View>
            <Text style={styles.addressText}>{contact.address.fullAddress}</Text>
            <View style={styles.addressActions}>
              <Pressable
                style={styles.addressButton}
                onPress={handleCopyAddress}
               
              >
                <Ionicons name="copy-outline" size={16} color={colors.brand.purple} />
                <Text style={styles.addressButtonText}>Copy</Text>
              </Pressable>
              <Pressable
                style={[styles.addressButton, styles.primaryButton]}
                onPress={handleGetDirections}
               
              >
                <Ionicons name="navigate" size={16} color={colors.background.primary} />
                <Text style={[styles.addressButtonText, styles.primaryButtonText]}>
                  Get Directions
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Working Hours */}
      {contact.workingHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <View style={styles.workingHoursCard}>
            <View style={styles.workingHoursHeader}>
              <Ionicons name="time" size={20} color={colors.brand.purple} />
              <Text style={styles.workingHoursTitle}>Store Timings</Text>
            </View>
            <View style={styles.workingHoursList}>{formatWorkingHours()}</View>
          </View>
        </View>
      )}

      {/* Share Contact Button */}
      <Pressable
        style={styles.shareContactButton}
        onPress={handleShareContact}
       
      >
        <Ionicons name="share-social" size={20} color={colors.brand.purple} />
        <Text style={styles.shareContactText}>Share Contact Info</Text>
      </Pressable>

      <View style={styles.footer}>
        <Ionicons name="information-circle" size={16} color={colors.midGray} />
        <Text style={styles.footerText}>
          Tap on any contact method to get in touch with us directly
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tint.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addressButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.purple,
    backgroundColor: colors.background.primary,
  },
  primaryButton: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  addressButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
    marginLeft: 6,
  },
  primaryButtonText: {
    color: colors.background.primary,
  },
  workingHoursCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  workingHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  workingHoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  workingHoursList: {
    gap: 8,
  },
  workingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    width: 50,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#444',
  },
  shareContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.purple,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  shareContactText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purple,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

// Mock data for demonstration
export const MOCK_CONTACT_INFO: StoreContactInfo = {
  phone: '+91 98765 43210',
  email: 'support@fashionstore.com',
  whatsapp: '+919876543210',
  website: 'www.fashionstore.com',
  socialMedia: {
    facebook: 'https://facebook.com/fashionstore',
    instagram: 'https://instagram.com/fashionstore',
    twitter: 'https://twitter.com/fashionstore',
    youtube: 'https://youtube.com/@fashionstore',
  },
  address: {
    street: '123 Fashion Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    fullAddress: '123 Fashion Street, Bandra West, Mumbai, Maharashtra 400001',
    coordinates: {
      latitude: 19.0596,
      longitude: 72.8295,
    },
  },
  workingHours: {
    monday: '10:00 AM - 9:00 PM',
    tuesday: '10:00 AM - 9:00 PM',
    wednesday: '10:00 AM - 9:00 PM',
    thursday: '10:00 AM - 9:00 PM',
    friday: '10:00 AM - 9:00 PM',
    saturday: '10:00 AM - 10:00 PM',
    sunday: '11:00 AM - 8:00 PM',
  },
};

export default React.memo(StoreContact);
