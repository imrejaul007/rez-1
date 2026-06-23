/**
 * Region Selector Component
 * Allows users to select their region (Bangalore, Dubai, China)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRegionState, useSetRegion } from '@/stores/selectors';
import type { RegionId } from '@/stores/regionStore';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Region data with flags
const REGIONS: { id: RegionId; name: string; flag: string; description: string; comingSoon?: boolean }[] = [
  { id: 'bangalore', name: 'India', flag: '\uD83C\uDDEE\uD83C\uDDF3', description: 'Bangalore, Mumbai, Delhi & more' },
  { id: 'dubai', name: 'Dubai', flag: '\uD83C\uDDE6\uD83C\uDDEA', description: 'UAE', comingSoon: true },
];

interface RegionSelectorProps {
  style?: any;
  showLabel?: boolean;
  compact?: boolean;
  onRegionChange?: (region: RegionId) => void;
}

export function RegionSelector({
  style,
  showLabel = true,
  compact = false,
  onRegionChange
}: RegionSelectorProps) {
  const state = useRegionState();
  const setRegion = useSetRegion();
  const [modalVisible, setModalVisible] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const isMounted = useIsMounted();

  const currentRegionData = REGIONS.find(r => r.id === state.currentRegion) || REGIONS[0];

  const handleRegionSelect = useCallback(async (regionId: RegionId) => {
    if (regionId === state.currentRegion) {
      setModalVisible(false);
      return;
    }

    platformAlertConfirm(
      'Change Region',
      'Changing region will clear your cart as prices are in different currencies. Continue?',
      async () => {
        setIsChanging(true);
        try {
          if (!isMounted()) return;
          await setRegion(regionId);
          onRegionChange?.(regionId);
          setModalVisible(false);
        } catch (error) {
          platformAlertSimple('Error', 'Failed to change region. Please try again.');
        } finally {
          if (!isMounted()) return;
          setIsChanging(false);
        }
      },
      'Continue'
    );
  }, [state.currentRegion, setRegion, onRegionChange]);

  if (compact) {
    return (
      <Pressable
        style={[styles.compactSelector, style]}
        onPress={() => setModalVisible(true)}
       
      >
        <Text style={styles.compactFlag}>{currentRegionData.flag}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.midGray} />

        <RegionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          currentRegion={state.currentRegion}
          onSelect={handleRegionSelect}
          isChanging={isChanging}
        />
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        style={[styles.selector, style]}
        onPress={() => setModalVisible(true)}
       
      >
        <Text style={styles.flag}>{currentRegionData.flag}</Text>
        {showLabel && (
          <>
            <Text style={styles.regionName}>{currentRegionData.name}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.midGray} />
          </>
        )}
      </Pressable>

      <RegionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentRegion={state.currentRegion}
        onSelect={handleRegionSelect}
        isChanging={isChanging}
      />
    </>
  );
}

// Modal component
interface RegionModalProps {
  visible: boolean;
  onClose: () => void;
  currentRegion: RegionId;
  onSelect: (region: RegionId) => void;
  isChanging: boolean;
}

function RegionModal({
  visible,
  onClose,
  currentRegion,
  onSelect,
  isChanging
}: RegionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.darkGray} />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Choose your region for localized stores and pricing
          </Text>

          {isChanging && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.brand.ios} />
              <Text style={styles.loadingText}>Switching region...</Text>
            </View>
          )}

          <View style={styles.regionsContainer}>
            {REGIONS.map((region) => (
              <Pressable
                key={region.id}
                style={[
                  styles.regionOption,
                  region.id === currentRegion && !region.comingSoon && styles.selectedRegion,
                  region.comingSoon && { opacity: 0.5 },
                ]}
                onPress={() => !region.comingSoon && onSelect(region.id)}
                disabled={region.comingSoon || isChanging}
              >
                <Text style={styles.regionFlag}>{region.flag}</Text>
                <View style={styles.regionInfo}>
                  <Text style={styles.regionOptionName}>{region.name}</Text>
                  <Text style={styles.regionDescription}>{region.description}</Text>
                </View>
                {region.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
                {region.id === currentRegion && !region.comingSoon && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.brand.ios} />
                )}
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Full page region selector for settings
export function RegionSelectorPage() {
  const state = useRegionState();
  const setRegion = useSetRegion();
  const [isChanging, setIsChanging] = useState(false);
  const isMounted = useIsMounted();

  const handleSelect = async (regionId: RegionId) => {
    if (regionId === state.currentRegion) return;

    platformAlertConfirm(
      'Change Region',
      'Changing region will clear your cart as prices are in different currencies. Continue?',
      async () => {
        setIsChanging(true);
        try {
          if (!isMounted()) return;
          await setRegion(regionId);
        } catch (error) {
          platformAlertSimple('Error', 'Failed to change region');
        } finally {
          if (!isMounted()) return;
          setIsChanging(false);
        }
      },
      'Continue'
    );
  };

  return (
    <View style={styles.pageContainer}>
      <Text style={styles.pageTitle}>Select Your Region</Text>
      <Text style={styles.pageSubtitle}>
        This determines which stores and products you see, and the currency used for pricing.
      </Text>

      {REGIONS.map((region) => (
        <Pressable
          key={region.id}
          style={[
            styles.pageRegionOption,
            region.id === state.currentRegion && !region.comingSoon && styles.pageSelectedRegion,
            region.comingSoon && { opacity: 0.5 },
          ]}
          onPress={() => !region.comingSoon && handleSelect(region.id)}
          disabled={region.comingSoon || isChanging}
        >
          <Text style={styles.pageRegionFlag}>{region.flag}</Text>
          <View style={styles.pageRegionInfo}>
            <Text style={styles.pageRegionName}>{region.name}</Text>
            <Text style={styles.pageRegionDescription}>{region.description}</Text>
          </View>
          {region.comingSoon ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          ) : region.id === state.currentRegion ? (
            <Ionicons name="checkmark-circle" size={28} color={colors.brand.ios} />
          ) : (
            <View style={styles.unselectedCircle} />
          )}
        </Pressable>
      ))}

      {isChanging && (
        <View style={styles.pageLoading}>
          <ActivityIndicator size="small" color={colors.brand.ios} />
          <Text style={styles.pageLoadingText}>Updating region...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact selector
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    gap: 4,
  },
  compactFlag: {
    fontSize: 14,
  },

  // Standard selector
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    gap: 6,
  },
  flag: {
    fontSize: 18,
  },
  regionName: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loadingOverlay: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.midGray,
    fontSize: 14,
  },
  regionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRegion: {
    backgroundColor: '#E8F4FD',
    borderColor: colors.brand.ios,
  },
  regionFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  regionInfo: {
    flex: 1,
  },
  regionOptionName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.darkGray,
  },
  regionDescription: {
    fontSize: 13,
    color: colors.midGray,
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    color: colors.midGray,
    fontWeight: '500',
  },

  // Page styles
  pageContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.midGray,
    marginBottom: 24,
    lineHeight: 22,
  },
  pageRegionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pageSelectedRegion: {
    backgroundColor: '#E8F4FD',
    borderColor: colors.brand.ios,
  },
  pageRegionFlag: {
    fontSize: 40,
    marginRight: 16,
  },
  pageRegionInfo: {
    flex: 1,
  },
  pageRegionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  pageRegionDescription: {
    fontSize: 14,
    color: colors.midGray,
    marginTop: 4,
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  pageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  pageLoadingText: {
    color: colors.brand.ios,
    fontSize: 14,
  },
});

export default React.memo(RegionSelector);
