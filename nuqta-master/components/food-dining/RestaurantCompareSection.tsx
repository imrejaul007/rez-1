/**
 * RestaurantCompareSection — inline compare picker + side-by-side table
 * Renders inside the Delivery tab of FoodDiningCategoryPage.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FoodRestaurant } from './constants';
import { platformAlertSimple } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';

const MAX_COMPARE = 5;
const MIN_COMPARE = 2;

interface RestaurantCompareSectionProps {
  restaurants: FoodRestaurant[];
  currencySymbol: string;
  onSaveComparison?: (storeIds: string[]) => void;
}

// --- Metric config ---
interface MetricDef {
  key: string;
  label: string;
  getValue: (r: FoodRestaurant) => number | undefined;
  format?: (v: number, sym: string) => string;
  bestIs: 'highest' | 'lowest';
}

const METRICS: MetricDef[] = [
  {
    key: 'rating',
    label: 'Rating',
    getValue: (r) => r.ratings?.average,
    format: (v) => v.toFixed(1),
    bestIs: 'highest',
  },
  {
    key: 'ratingCount',
    label: 'Reviews',
    getValue: (r) => r.ratings?.count,
    format: (v) => v.toLocaleString(),
    bestIs: 'highest',
  },
  {
    key: 'deliveryTime',
    label: 'Delivery',
    getValue: (r) => {
      const t = r.operationalInfo?.deliveryTime;
      return t ? parseInt(t, 10) : undefined;
    },
    format: (v) => `${v} min`,
    bestIs: 'lowest',
  },
  {
    key: 'priceForTwo',
    label: 'Price for Two',
    getValue: (r) => r.priceForTwo,
    format: (v, sym) => `${sym}${v}`,
    bestIs: 'lowest',
  },
  {
    key: 'cashback',
    label: 'Cashback',
    getValue: (r) => r.offers?.cashback,
    format: (v) => `${v}%`,
    bestIs: 'highest',
  },
  {
    key: 'minOrder',
    label: 'Min Order',
    getValue: (r) => r.operationalInfo?.minimumOrder,
    format: (v, sym) => `${sym}${v}`,
    bestIs: 'lowest',
  },
];

// --- Helpers ---
function getStoreId(r: FoodRestaurant): string {
  return r._id || r.id || '';
}

function getBestValues(selected: FoodRestaurant[]): Record<string, number | undefined> {
  const best: Record<string, number | undefined> = {};
  for (const m of METRICS) {
    const values = selected.map(m.getValue).filter((v): v is number => v != null);
    if (values.length === 0) { best[m.key] = undefined; continue; }
    best[m.key] = m.bestIs === 'highest' ? Math.max(...values) : Math.min(...values);
  }
  return best;
}

function getCuisines(r: FoodRestaurant): string {
  const tags = r.tags?.filter((t) => !['veg', 'non-veg', 'halal', 'jain', 'vegan'].includes(t.toLowerCase()));
  return tags?.slice(0, 3).join(', ') || '-';
}

function getBestPick(selected: FoodRestaurant[]): string | null {
  if (selected.length < 2) return null;
  const best = getBestValues(selected);
  const wins: Record<string, number> = {};
  for (const r of selected) {
    const id = getStoreId(r);
    wins[id] = 0;
  }
  for (const m of METRICS) {
    if (best[m.key] == null) continue;
    for (const r of selected) {
      const v = m.getValue(r);
      if (v != null && v === best[m.key]) wins[getStoreId(r)]++;
    }
  }
  const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) return null;
  return sorted[0]?.[0] || null;
}

// ========== Component ==========
const RestaurantCompareSection: React.FC<RestaurantCompareSectionProps> = ({
  restaurants,
  currencySymbol,
  onSaveComparison,
}) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTable, setShowTable] = useState(false);

  // Don't render if fewer than 2 restaurants
  if (restaurants.length < MIN_COMPARE) return null;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_COMPARE) {
          platformAlertSimple('Limit Reached', `You can compare up to ${MAX_COMPARE} restaurants at a time.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
    setShowTable(false);
  }, []);

  const selectedRestaurants = useMemo(
    () => restaurants.filter((r) => selectedIds.has(getStoreId(r))),
    [restaurants, selectedIds]
  );

  const bestValues = useMemo(() => getBestValues(selectedRestaurants), [selectedRestaurants]);
  const bestPickId = useMemo(() => getBestPick(selectedRestaurants), [selectedRestaurants]);

  const handleCompareNow = useCallback(() => {
    if (selectedIds.size < MIN_COMPARE) return;
    setShowTable(true);
  }, [selectedIds.size]);

  const handleReset = useCallback(() => {
    setSelectedIds(new Set());
    setShowTable(false);
  }, []);

  const handleSave = useCallback(() => {
    if (onSaveComparison) {
      onSaveComparison(Array.from(selectedIds));
    }
  }, [onSaveComparison, selectedIds]);

  const handleViewMenu = useCallback((storeId: string) => {
    router.push(`/MainStorePage?storeId=${storeId}` as any);
  }, [router]);

  // --- Selection chips ---
  const renderChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
    >
      {restaurants.slice(0, 20).map((r) => {
        const id = getStoreId(r);
        const isSelected = selectedIds.has(id);
        return (
          <Pressable
            key={id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => toggleSelect(id)}
           
            accessibilityLabel={`${r.name}${isSelected ? ', selected for comparison' : ', tap to select for comparison'}`}
            accessibilityRole="button"
          >
            {r.logo ? (
              <CachedImage source={r.logo} style={styles.chipLogo} />
            ) : (
              <View style={styles.chipLogoFallback}>
                <Ionicons name="restaurant-outline" size={14} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]} numberOfLines={1}>
              {r.name}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryGold} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // --- Comparison table ---
  const renderTable = () => {
    const COL_W = 140;
    const LABEL_W = 100;

    return (
      <View style={styles.tableWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
          <View>
            {/* Header row */}
            <View style={styles.tableRow}>
              <View style={[styles.labelCell, { width: LABEL_W }]}>
                <Text style={styles.labelText}>Restaurant</Text>
              </View>
              {selectedRestaurants.map((r) => {
                const id = getStoreId(r);
                return (
                  <View key={id} style={[styles.dataCell, { width: COL_W }]}>
                    {r.logo ? (
                      <CachedImage source={r.logo} style={styles.tableLogo} />
                    ) : (
                      <View style={[styles.tableLogo, styles.tableLogoFallback]}>
                        <Ionicons name="restaurant-outline" size={18} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.tableStoreName} numberOfLines={2}>{r.name}</Text>
                    {r.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.infoScale[400]} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    {bestPickId === id && (
                      <View style={styles.bestPickBadge}>
                        <Ionicons name="trophy" size={10} color={colors.background.primary} />
                        <Text style={styles.bestPickText}>Best Pick</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Metric rows */}
            {METRICS.map((m) => (
              <View key={m.key} style={styles.tableRow}>
                <View style={[styles.labelCell, { width: LABEL_W }]}>
                  <Text style={styles.labelText}>{m.label}</Text>
                </View>
                {selectedRestaurants.map((r) => {
                  const id = getStoreId(r);
                  const val = m.getValue(r);
                  const isBest = val != null && val === bestValues[m.key];
                  const display = val != null ? (m.format ? m.format(val, currencySymbol) : String(val)) : '-';
                  return (
                    <View key={id} style={[styles.dataCell, { width: COL_W }]}>
                      {m.key === 'rating' && val != null && (
                        <Ionicons name="star" size={12} color={isBest ? colors.brand.greenDark : COLORS.primaryGold} style={{ marginRight: 3 }} />
                      )}
                      <Text style={[styles.dataText, isBest && styles.dataTextBest]}>{display}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Cuisines row */}
            <View style={styles.tableRow}>
              <View style={[styles.labelCell, { width: LABEL_W }]}>
                <Text style={styles.labelText}>Cuisines</Text>
              </View>
              {selectedRestaurants.map((r) => (
                <View key={getStoreId(r)} style={[styles.dataCell, { width: COL_W }]}>
                  <Text style={styles.dataTextSmall} numberOfLines={2}>{getCuisines(r)}</Text>
                </View>
              ))}
            </View>

            {/* Action row */}
            <View style={styles.tableRow}>
              <View style={[styles.labelCell, { width: LABEL_W }]} />
              {selectedRestaurants.map((r) => (
                <View key={getStoreId(r)} style={[styles.dataCell, { width: COL_W }]}>
                  <Pressable
                    style={styles.viewMenuBtn}
                    onPress={() => handleViewMenu(getStoreId(r))}
                   
                    accessibilityLabel={`View menu for ${r.name}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.viewMenuText}>View Menu</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Save / Reset actions */}
        <View style={styles.tableActions}>
          {onSaveComparison && (
            <Pressable style={styles.saveBtn} onPress={handleSave}
              accessibilityLabel="Save this comparison" accessibilityRole="button">
              <Ionicons name="bookmark-outline" size={16} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Save Comparison</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={handleReset}
            accessibilityLabel="Reset comparison selection" accessibilityRole="button">
            <Ionicons name="refresh-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="git-compare-outline" size={20} color={COLORS.primaryGold} />
        <Text style={styles.sectionTitle}>Compare Restaurants</Text>
        {showTable && (
          <Pressable onPress={handleReset} accessibilityLabel="Start new comparison" accessibilityRole="button">
            <Text style={styles.sectionAction}>New Compare</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.subtitle}>
        {showTable
          ? `Comparing ${selectedRestaurants.length} restaurants`
          : `Select ${MIN_COMPARE}-${MAX_COMPARE} restaurants to compare`}
      </Text>

      {/* Selection chips */}
      {!showTable && (
        <>
          {renderChips()}
          <View style={styles.selectionFooter}>
            <Text style={styles.countText}>
              {selectedIds.size}/{MAX_COMPARE} selected
            </Text>
            <Pressable
              style={[styles.compareBtn, selectedIds.size < MIN_COMPARE && styles.compareBtnDisabled]}
              onPress={handleCompareNow}
              disabled={selectedIds.size < MIN_COMPARE}
             
              accessibilityLabel={`Compare ${selectedIds.size} restaurants${selectedIds.size < MIN_COMPARE ? ', select at least 2' : ''}`}
              accessibilityRole="button"
            >
              <Ionicons name="git-compare-outline" size={16} color={colors.background.primary} />
              <Text style={styles.compareBtnText}>Compare Now</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Comparison table */}
      {showTable && renderTable()}
    </View>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 12px rgba(11,34,64,0.06)' },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryGold,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  // --- Chips ---
  chipsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipSelected: {
    borderColor: COLORS.primaryGold,
    backgroundColor: colors.tint.amber,
  },
  chipLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  chipLogoFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    maxWidth: 100,
  },
  chipTextSelected: {
    fontWeight: '600',
    color: colors.brand.amberDeep,
  },
  // --- Selection footer ---
  selectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  countText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  compareBtnDisabled: {
    opacity: 0.4,
  },
  compareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // --- Table ---
  tableWrapper: {
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    minHeight: 44,
  },
  labelCell: {
    justifyContent: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dataCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dataText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  dataTextBest: {
    color: colors.brand.greenDark,
    fontWeight: '700',
  },
  dataTextSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // --- Table header ---
  tableLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  tableLogoFallback: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableStoreName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.infoScale[400],
    fontWeight: '500',
  },
  bestPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.greenDark,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    gap: 3,
  },
  bestPickText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // --- Actions ---
  viewMenuBtn: {
    backgroundColor: COLORS.primaryGold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewMenuText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  tableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default React.memo(RestaurantCompareSection);
