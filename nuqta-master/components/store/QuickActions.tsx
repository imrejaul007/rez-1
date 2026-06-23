// QuickActions.tsx
// Grid of quick action buttons for store pages (dynamic based on store type)

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { colors } from '@/constants/theme';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  visible?: boolean;
}

interface QuickActionsProps {
  storeId: string;
  storeName: string;
  bookingType?: 'RESTAURANT' | 'SERVICE' | 'CONSULTATION' | 'RETAIL' | 'HYBRID';
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  location?: {
    coordinates?: [number, number];
    address?: string;
  };
  hasMenu?: boolean;
  variant?: 'default' | 'compact'; // Compact variant for cards
  maxActions?: number; // Limit number of actions displayed
  hideTitle?: boolean; // Option to hide "Quick Actions" title
}

const QuickActions: React.FC<QuickActionsProps> = ({
  storeId,
  storeName,
  bookingType = 'RETAIL',
  contact,
  location,
  hasMenu = false,
  variant = 'default',
  maxActions,
  hideTitle = false,
}) => {
  const router = useRouter();

  const handleBookTable = () => {
    router.push(`/booking/table?storeId=${storeId}`);
  };

  const handleBookAppointment = () => {
    router.push(`/booking/appointment?storeId=${storeId}`);
  };

  const handleBookConsultation = () => {
    router.push(`/booking/consultation?storeId=${storeId}`);
  };

  const handlePlanStoreVisit = () => {
    if (!storeId) {
      showAlert('Error', 'Store information is not available', undefined, 'warning');
      return;
    }
    router.push(`/store-visit?storeId=${storeId}`);
  };

  const handleViewMenu = () => {
    router.push(`/menu/${storeId}`);
  };

  const handleCallStore = () => {
    if (!contact?.phone) {
      showAlert('No Phone Number', 'Phone number is not available for this store', undefined, 'warning');
      return;
    }

    const phoneNumber = contact.phone.replace(/[^0-9+]/g, '');
    const url = `tel:${phoneNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          showAlert('Error', 'Phone dialer is not available', undefined, 'error');
        }
      })
      .catch((err) => {
        showAlert('Error', 'Failed to open phone dialer', undefined, 'error');
      });
  };

  const handleGetDirections = () => {
    if (!location?.coordinates && !location?.address) {
      showAlert('No Location', 'Location information is not available for this store', undefined, 'warning');
      return;
    }

    if (location?.coordinates) {
      const [longitude, latitude] = location.coordinates;
      const label = encodeURIComponent(storeName);
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      });

      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(url);
          } else {
            const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            return Linking.openURL(webUrl);
          }
        })
        .catch((err) => {
          showAlert('Error', 'Failed to open maps', undefined, 'error');
        });
    } else if (location?.address) {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
      Linking.openURL(webUrl).catch(() => {
        showAlert('Error', 'Failed to open maps', undefined, 'error');
      });
    }
  };

  const handleShareStore = async () => {
    try {
      const message = `Check out ${storeName}! ${location?.address || ''}`;
      const url = `https://app.example.com/store/${storeId}`;

      await Share.share({
        message: `${message}\n${url}`,
        url: url,
        title: storeName,
      });
    } catch (error) {
      // silently handle
    }
  };

  const handleViewReviews = () => {
    router.push(`/reviews/${storeId}`);
  };

  const handleMessaging = () => {
    router.push(`/messages?storeId=${storeId}&storeName=${encodeURIComponent(storeName)}`);
  };

  const handleViewOffers = () => {
    router.push(`/offers?storeId=${storeId}`);
  };

  // Build actions array based on booking type and available data
  const actions = useMemo<QuickAction[]>(() => {
    const allActions: QuickAction[] = [];

    // Add booking action based on bookingType
    if (bookingType === 'RESTAURANT') {
      allActions.push({
        id: 'book-table',
        label: 'Book Table',
        icon: 'restaurant',
        onPress: handleBookTable,
        visible: true,
      });
    } else if (bookingType === 'SERVICE') {
      allActions.push({
        id: 'book-appointment',
        label: 'Appointment',
        icon: 'calendar',
        onPress: handleBookAppointment,
        visible: true,
      });
    } else if (bookingType === 'CONSULTATION') {
      allActions.push({
        id: 'book-consultation',
        label: 'Consult',
        icon: 'medical',
        onPress: handleBookConsultation,
        visible: true,
      });
    } else if (bookingType === 'RETAIL') {
      allActions.push({
        id: 'plan-visit',
        label: 'Plan Visit',
        icon: 'time',
        onPress: handlePlanStoreVisit,
        visible: true,
      });
    } else if (bookingType === 'HYBRID') {
      allActions.push({
        id: 'book-table',
        label: 'Book Table',
        icon: 'restaurant',
        onPress: handleBookTable,
        visible: true,
      });
      allActions.push({
        id: 'book-appointment',
        label: 'Appointment',
        icon: 'calendar',
        onPress: handleBookAppointment,
        visible: true,
      });
    }

    if (hasMenu) {
      allActions.push({
        id: 'menu',
        label: 'Menu',
        icon: 'list',
        onPress: handleViewMenu,
        visible: true,
      });
    }

    allActions.push(
      {
        id: 'call',
        label: 'Call',
        icon: 'call',
        onPress: handleCallStore,
        visible: !!contact?.phone,
      },
      {
        id: 'directions',
        label: 'Directions',
        icon: 'navigate',
        onPress: handleGetDirections,
        visible: !!(location?.coordinates || location?.address),
      },
      {
        id: 'share',
        label: 'Share',
        icon: 'share-social',
        onPress: handleShareStore,
        visible: true,
      },
      {
        id: 'reviews',
        label: 'Reviews',
        icon: 'star',
        onPress: handleViewReviews,
        visible: true,
      },
      {
        id: 'message',
        label: 'Message',
        icon: 'chatbubble',
        onPress: handleMessaging,
        visible: true,
      },
      {
        id: 'offers',
        label: 'Offers',
        icon: 'pricetag',
        onPress: handleViewOffers,
        visible: true,
      }
    );

    const filtered = allActions.filter(action => action.visible !== false);
    const limit = maxActions || (variant === 'compact' ? 4 : 8);
    return filtered.slice(0, limit);
  }, [bookingType, contact, location, hasMenu, variant, maxActions]);

  if (actions.length === 0) {
    return null;
  }

  const isCompact = variant === 'compact';

  // Compact variant: horizontal scrollable row of small pill buttons
  if (isCompact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactScroll}
          bounces={false}
        >
          {actions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.compactButton}
              onPress={action.onPress}
             
            >
              <View style={styles.compactIconCircle}>
                <Ionicons name={action.icon} size={14} color={colors.brand.green} />
              </View>
              <Text style={styles.compactLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Default variant: compact 3-column grid
  return (
    <View style={styles.container}>
      {!hideTitle && <Text style={styles.title}>Quick Actions</Text>}
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
           
          >
            <View style={styles.iconContainer}>
              <Ionicons name={action.icon} size={18} color={colors.brand.green} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Default variant styles
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionButton: {
    width: '31.5%',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
  },

  // Compact variant styles (horizontal pills)
  compactContainer: {
    paddingVertical: 2,
  },
  compactScroll: {
    gap: 6,
    paddingHorizontal: 2,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.tint.green,
    gap: 5,
  },
  compactIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 192, 106, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
});

export default React.memo(QuickActions);
