/**
 * Shop by Experience Section - Production Ready
 * Fetches experiences from backend API
 * Curated shopping experiences with 3x3 grid layout
 */

import React, { useState, useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { experiencesApi } from '@/services/experiencesApi';
import { getTheme } from '@/constants/experienceThemes';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShopByExperienceSection: React.FC = () => {
  const router = useRouter();
  const [experiences, setExperiences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  // Fallback experiences if API fails or is empty
  const FALLBACK_EXPERIENCES = [
    { id: '1', slug: 'sample-trial', title: 'Sample/Trial Store', subtitle: 'Try before you buy' },
    { id: '2', slug: '60-min-delivery', title: '60 Min Delivery', subtitle: 'Ultra-fast delivery' },
    { id: '3', slug: 'luxury', title: 'Luxury Store', subtitle: 'Premium brands' },
    { id: '4', slug: 'organic', title: 'Organic Store', subtitle: '100% natural' },
    { id: '5', slug: 'men', title: 'Men Store', subtitle: 'For modern men' },
    { id: '6', slug: 'women', title: 'Women Store', subtitle: 'Curated for her' },
    { id: '7', slug: 'children', title: 'Children Store', subtitle: 'Kids essentials' },
    { id: '8', slug: 'rental', title: 'Rental Store', subtitle: 'Rent not buy' },
    { id: '9', slug: 'gifting', title: 'Gifting Store', subtitle: 'Perfect presents' },
  ];

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        setIsLoading(true);
        const response = await experiencesApi.getExperiences({ limit: 20 });

        if (response.success && response.data && response.data.experiences.length > 0) {
          // Merge API data with themes
          const apiItems = response.data.experiences.map(exp => {
            const theme = getTheme(exp.slug);
            return {
              ...exp,
              bg: theme.bg,
              icon: exp.icon || theme.icon,
              iconColor: theme.iconColor,
            };
          });

          // Fill up to 9 items
          if (apiItems.length < 9) {
            const extraCount = 9 - apiItems.length;
            const extraItems = FALLBACK_EXPERIENCES.slice(0, extraCount).map(f => {
              const theme = getTheme(f.slug);
              return {
                ...f,
                bg: theme.bg,
                icon: theme.icon,
                iconColor: theme.iconColor
              };
            });
            if (!isMounted()) return;
            setExperiences([...apiItems, ...extraItems]);
          } else {
            setExperiences(apiItems);
          }
        } else {
          // Full fallback
          setExperiences(FALLBACK_EXPERIENCES.map(f => {
            const theme = getTheme(f.slug);
            return {
              ...f,
              bg: theme.bg,
              icon: theme.icon,
              iconColor: theme.iconColor
            };
          }));
        }
      } catch (error) {
        if (!isMounted()) return;
        setExperiences(FALLBACK_EXPERIENCES.map(f => {
          const theme = getTheme(f.slug);
          return {
            ...f,
            bg: theme.bg,
            icon: theme.icon,
            iconColor: theme.iconColor
          };
        }));
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, []);

  const handlePress = (slug: string) => {
    router.push(`/experience/${slug}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛍️ Shop by Experience</Text>
        <Text style={styles.headerSubtitle}>Curated shopping experiences</Text>
      </View>

      {/* Experience Grid */}
      <View style={styles.grid}>
        {experiences.slice(0, 9).map((exp: any) => (
          <Pressable
            key={exp.id || exp.slug}
            style={styles.cardWrapper}
            onPress={() => handlePress(exp.slug || exp.path)}
           
          >
            <View style={[styles.card, { backgroundColor: exp.bg }]}>
              <View style={styles.iconContainer}>
                <Text style={[styles.cardIcon, { color: exp.iconColor }]}>{exp.icon}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{exp.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{exp.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Bottom Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          ✨ <Text style={styles.bannerBold}>All experiences</Text> come with {BRAND.APP_NAME} cashback & coins
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.slateGray,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardWrapper: {
    width: '31.5%', // Force 3 columns
    marginBottom: 12,
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 125,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 10,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
  },
  cardSubtitle: {
    fontSize: 9,
    color: colors.slateGray,
    textAlign: 'center',
    fontWeight: '400',
  },
  banner: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.lightMustard,
    backgroundColor: colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'center',
  },
  bannerBold: {
    fontWeight: '700',
  },
});

export default React.memo(ShopByExperienceSection);
