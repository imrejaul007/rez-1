import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationHistory } from '@/hooks/useLocation';
import { locationService } from '@/services/locationService';
import { LocationStats } from '@/types/location.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface LocationAnalyticsProps {
  onViewHistory?: () => void;
  onViewStats?: () => void;
  style?: any;
}

function LocationAnalytics({
  onViewHistory,
  onViewStats,
  style,
}: LocationAnalyticsProps) {
  const { locationHistory } = useLocationHistory();
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const locationStats = await locationService.getLocationStats();
      if (!isMounted()) return;
      setStats(locationStats);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load location statistics');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const getMostVisitedCity = () => {
    if (!stats?.mostVisitedCity) return 'No data';
    return stats.mostVisitedCity;
  };

  const getLastUpdatedText = () => {
    if (!stats?.lastUpdated) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - stats.lastUpdated.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const getLocationFrequency = () => {
    if (locationHistory.length === 0) return 'No data';
    
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const weekCount = locationHistory.filter(
      entry => entry.timestamp > lastWeek
    ).length;
    
    const monthCount = locationHistory.filter(
      entry => entry.timestamp > lastMonth
    ).length;
    
    return `${weekCount} this week, ${monthCount} this month`;
  };

  const getTopCities = () => {
    if (locationHistory.length === 0) return [];
    
    const cityCount: { [key: string]: number } = {};
    locationHistory.forEach(entry => {
      if (entry.city) {
        cityCount[entry.city] = (cityCount[entry.city] || 0) + 1;
      }
    });
    
    return Object.entries(cityCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([city, count]) => ({ city, count }));
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: string,
    color: string
  ) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={20} color="white" />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderCityItem = (city: { city: string; count: number }, index: number) => (
    <View key={city.city} style={styles.cityItem}>
      <View style={styles.cityRank}>
        <Text style={styles.cityRankText}>#{index + 1}</Text>
      </View>
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{city.city}</Text>
        <Text style={styles.cityCount}>{city.count} visits</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={colors.brand.ios} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorTitle}>Unable to load analytics</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadStats}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const topCities = getTopCities();

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Location Analytics</Text>
        <Text style={styles.subtitle}>Your location usage insights</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total Locations',
          stats?.totalLocations || 0,
          'All time',
          'location',
          colors.brand.ios
        )}
        {renderStatCard(
          'Cities Visited',
          stats?.uniqueCities || 0,
          'Unique locations',
          'map',
          '#34C759'
        )}
        {renderStatCard(
          'Most Visited',
          getMostVisitedCity(),
          'Top city',
          'trophy',
          '#FF9500'
        )}
        {renderStatCard(
          'Last Updated',
          getLastUpdatedText(),
          'Location data',
          'time',
          '#8E8E93'
        )}
      </View>

      {/* Location Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Frequency</Text>
        <View style={styles.frequencyCard}>
          <View style={styles.frequencyContent}>
            <Ionicons name="pulse" size={24} color={colors.brand.ios} />
            <View style={styles.frequencyText}>
              <Text style={styles.frequencyTitle}>Recent Activity</Text>
              <Text style={styles.frequencySubtitle}>{getLocationFrequency()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Top Cities */}
      {topCities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Cities</Text>
          <View style={styles.citiesCard}>
            {topCities.map(renderCityItem)}
          </View>
        </View>
      )}

      {/* Current Location */}
      {stats?.currentLocation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <View style={styles.currentLocationCard}>
            <View style={styles.currentLocationContent}>
              <Ionicons name="location" size={24} color="#34C759" />
              <View style={styles.currentLocationText}>
                <Text style={styles.currentLocationTitle}>
                  {stats.currentLocation.city}, {stats.currentLocation.state}
                </Text>
                <Text style={styles.currentLocationSubtitle}>
                  {stats.currentLocation.coordinates.latitude.toFixed(4)}, {stats.currentLocation.coordinates.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <Pressable
          style={styles.actionButton}
          onPress={onViewHistory}
        >
          <View style={styles.actionContent}>
            <Ionicons name="time" size={20} color={colors.brand.ios} />
            <Text style={styles.actionText}>View History</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onViewStats}
        >
          <View style={styles.actionContent}>
            <Ionicons name="analytics" size={20} color={colors.brand.ios} />
            <Text style={styles.actionText}>Detailed Stats</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.tint.warmGray,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.midGray,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    color: colors.midGray,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999999',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 12,
  },
  frequencyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  frequencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyText: {
    marginLeft: 12,
    flex: 1,
  },
  frequencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  frequencySubtitle: {
    fontSize: 14,
    color: colors.midGray,
  },
  citiesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cityRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cityRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 2,
  },
  cityCount: {
    fontSize: 14,
    color: colors.midGray,
  },
  currentLocationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocationText: {
    marginLeft: 12,
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  currentLocationSubtitle: {
    fontSize: 14,
    color: colors.midGray,
  },
  actionsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginLeft: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.midGray,
    marginTop: 12,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.brand.ios,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Compact version for small spaces
export function CompactLocationAnalytics(props: LocationAnalyticsProps) {
  return (
    <LocationAnalytics
      {...props}
      style={[props.style, { padding: 12 }]}
    />
  );
}

export default React.memo(LocationAnalytics);
