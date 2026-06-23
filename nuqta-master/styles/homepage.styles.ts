/**
 * Homepage Styles
 *
 * Extracted from app/(tabs)/index.tsx (lines 933-1316)
 * Centralized stylesheet for homepage components
 *
 * @styles
 */

import { StyleSheet, Platform } from 'react-native';

/**
 * Text Styles
 * All text-related styles for homepage
 */
export const textStyles = StyleSheet.create({
  locationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  coinsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  profileText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 14,
  },
  greeting: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#666',
  },
  partnerLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  level1: {
    fontSize: 12,
    color: '#666',
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
  },
  actionLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginTop: 8,
  },
  actionValue: {
    fontSize: 12,
    color: '#ffcd57',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#ffcd57',
    fontWeight: '600',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
});

/**
 * View Styles
 * All view/layout-related styles for homepage
 */
export const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  locationDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
  },
  locationArrow: {
    marginLeft: 8,
  },
  detailedLocationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#ffcd57',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.1)',
  },
  detailedLocationContent: {
    padding: 16,
  },
  addressSection: {
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffcd57',
    marginLeft: 6,
  },
  coordinatesSection: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 58, 82, 0.1)',
  },
  coordinatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coordinatesHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  coordinatesDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
  },
  coordinatesText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  refreshSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 58, 82, 0.1)',
    alignItems: 'center',
  },
  refreshDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
    alignSelf: 'stretch',
  },
  refreshText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  detailedLocationDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
  },
  detailedLocationText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  greetingContainer: {
    marginVertical: 8,
  },
  greetingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        outline: 'none',
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  partnerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    marginBottom: 16,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  progressDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffcd57',
    marginHorizontal: 6,
  },
  partnerArrow: {
    padding: 4,
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 12,
    elevation: 3,
    marginBottom: 18,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  horizontalScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  webScrollContainer: {
    paddingHorizontal: 4,
  },
  webScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalCategoryItem: {
    alignItems: 'center',
    minWidth: 70,
    marginRight: 12,
  },
  horizontalCategorySpacing: {
    marginLeft: 8,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  iosActionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  defaultActionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
});

/**
 * Combined export for convenience
 */
export const homepageStyles = {
  text: textStyles,
  view: viewStyles,
};

export default homepageStyles;
