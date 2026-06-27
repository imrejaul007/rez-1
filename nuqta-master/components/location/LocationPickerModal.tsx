// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAddressSearch } from '@/hooks/useLocation';
import { useLocation } from '@/contexts/LocationContext';
import { AddressSearchResult, UserLocation } from '@/types/location.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: AddressSearchResult) => void;
  currentLocation?: UserLocation | null;
}

type ModalStep = 'search' | 'details';

function LocationPickerModal({
  visible,
  onClose,
  onLocationSelect,
  currentLocation,
}: LocationPickerModalProps) {
  const [query, setQuery] = useState('');
  const isMounted = useIsMounted();
  const { search, searchResults, isSearching, clearResults } = useAddressSearch();
  const { getCurrentLocation } = useLocation();
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // New state for details form
  const [modalStep, setModalStep] = useState<ModalStep>('search');
  const [selectedLocation, setSelectedLocation] = useState<AddressSearchResult | null>(null);
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        search(query);
      }, 300);
    } else {
      clearResults();
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search, clearResults]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      clearResults();
      setModalStep('search');
      setSelectedLocation(null);
      setLocality('');
      setPincode('');
    } else {
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible, clearResults]);

  const handleUseCurrentLocation = useCallback(async () => {
    Keyboard.dismiss();
    setIsGettingCurrentLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        onClose();
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsGettingCurrentLocation(false);
    }
  }, [getCurrentLocation, onClose]);

  const handleSelectResult = useCallback((result: AddressSearchResult) => {
    Keyboard.dismiss();
    // Instead of immediately selecting, show details form
    setSelectedLocation(result);
    setLocality('');
    setPincode(result.pincode || '');
    setModalStep('details');
  }, []);

  const handleConfirmLocation = useCallback(() => {
    if (!selectedLocation) return;

    // Build enhanced address with user-provided details
    let enhancedAddress = selectedLocation.formattedAddress;
    if (locality.trim()) {
      enhancedAddress = `${locality.trim()}, ${enhancedAddress}`;
    }

    // Extract neighbourhood from the address (first part before comma, if not the city itself)
    let neighbourhood: string | undefined;
    if (locality.trim()) {
      neighbourhood = locality.trim();
    } else if (selectedLocation.address) {
      const firstPart = selectedLocation.address.split(',')[0].trim();
      const cityName = selectedLocation.city || '';
      if (firstPart && firstPart !== cityName && firstPart.length < 40) {
        neighbourhood = firstPart;
      }
    }

    const enhancedLocation: AddressSearchResult = {
      ...selectedLocation,
      formattedAddress: enhancedAddress,
      address: enhancedAddress,
      neighbourhood,
      pincode: pincode.trim() || selectedLocation.pincode || '',
    };

    onLocationSelect(enhancedLocation);
  }, [selectedLocation, locality, pincode, onLocationSelect]);

  const handleBackToSearch = useCallback(() => {
    setModalStep('search');
    setSelectedLocation(null);
    setLocality('');
    setPincode('');
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    clearResults();
    inputRef.current?.focus();
  }, [clearResults]);

  const renderResultItem = useCallback(({ item }: { item: AddressSearchResult }) => (
    <Pressable
      style={styles.resultItem}
      onPress={() => handleSelectResult(item)}
     
    >
      <View style={styles.resultIconContainer}>
        <Ionicons name="location-outline" size={20} color={colors.midGray} />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultAddress} numberOfLines={2}>
          {item.formattedAddress}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </Pressable>
  ), [handleSelectResult]);

  const keyExtractor = useCallback((item: AddressSearchResult, index: number) =>
    `${item.placeId || item.address}-${index}`, []);

  const ListEmptyComponent = useCallback(() => {
    if (query.length >= 2 && !isSearching) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyStateText}>
            No locations found for "{query}"
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Try a different search term
          </Text>
        </View>
      );
    }
    if (query.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyStateText}>
            Search for a location
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Type at least 2 characters to search
          </Text>
        </View>
      );
    }
    return null;
  }, [query, isSearching]);

  // Render Details Form
  const renderDetailsForm = () => (
    <ScrollView style={styles.detailsContainer} keyboardShouldPersistTaps="handled">
      {/* Selected Location Display */}
      <View style={styles.selectedLocationCard}>
        <View style={styles.selectedLocationIcon}>
          <Ionicons name="location" size={24} color={colors.brand.green} />
        </View>
        <View style={styles.selectedLocationInfo}>
          <Text style={styles.selectedLocationLabel}>Selected Location</Text>
          <Text style={styles.selectedLocationAddress} numberOfLines={2}>
            {selectedLocation?.formattedAddress}
          </Text>
          {(selectedLocation?.city || selectedLocation?.state) && (
            <Text style={styles.selectedLocationMeta}>
              {[selectedLocation?.city, selectedLocation?.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </View>

      {/* Optional Details Section */}
      <View style={styles.optionalSection}>
        <Text style={styles.optionalTitle}>Add More Details (Optional)</Text>
        <Text style={styles.optionalSubtitle}>
          Add your area or pincode for a more accurate location
        </Text>

        {/* Locality/Area Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Area / Locality / Street</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={18} color={colors.neutral[400]} style={styles.inputIcon} />
            <TextInput
              style={styles.detailInput}
              placeholder="e.g., Boring Road, Gandhi Maidan"
              placeholderTextColor={colors.neutral[400]}
              value={locality}
              onChangeText={setLocality}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Pincode Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pincode</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={colors.neutral[400]} style={styles.inputIcon} />
            <TextInput
              style={styles.detailInput}
              placeholder="e.g., 800001"
              placeholderTextColor={colors.neutral[400]}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={styles.confirmButton}
          onPress={handleConfirmLocation}
         
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={handleConfirmLocation}

        >
          <Text style={styles.skipButtonText}>Skip & Continue</Text>
        </Pressable>

        <Text style={styles.locationHintText}>
          You can change this anytime — set a different area to browse deals for a friend or specific location.
        </Text>
      </View>
    </ScrollView>
  );

  // Render Search View
  const renderSearchView = () => (
    <>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.neutral[400]} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search for area, street, city..."
          placeholderTextColor={colors.neutral[400]}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={handleClearQuery}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
          </Pressable>
        )}
        {isSearching && (
          <ActivityIndicator size="small" color={colors.brand.green} style={styles.searchLoader} />
        )}
      </View>

      {/* Use Current Location Button */}
      <Pressable
        style={styles.currentLocationButton}
        onPress={handleUseCurrentLocation}
       
        disabled={isGettingCurrentLocation}
      >
        <View style={styles.currentLocationIcon}>
          {isGettingCurrentLocation ? (
            <ActivityIndicator size="small" color={colors.brand.green} />
          ) : (
            <Ionicons name="locate" size={20} color={colors.brand.green} />
          )}
        </View>
        <View style={styles.currentLocationTextContainer}>
          <Text style={styles.currentLocationTitle}>Use current location</Text>
          <Text style={styles.currentLocationSubtitle} numberOfLines={1}>
            {currentLocation?.address?.formattedAddress || 'Detect my location using GPS'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.brand.green} />
      </Pressable>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Search Results</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Results List */}
      <FlashList
        data={searchResults}
        renderItem={renderResultItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={searchResults.length === 0 ? styles.emptyListContent : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={ListEmptyComponent}
        estimatedItemSize={60}
      />
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          style={styles.backdrop}
         
          onPress={onClose}
        />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {modalStep === 'details' ? (
              <Pressable
                onPress={handleBackToSearch}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
              </Pressable>
            ) : null}
            <Text style={[styles.headerTitle, modalStep === 'details' && styles.headerTitleWithBack]}>
              {modalStep === 'search' ? 'Change Location' : 'Confirm Location'}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.neutral[800]} />
            </Pressable>
          </View>

          {modalStep === 'search' ? renderSearchView() : renderDetailsForm()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    flex: 1,
  },
  headerTitleWithBack: {
    textAlign: 'center',
    marginRight: 36,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[800],
    paddingVertical: 0,
  },
  searchLoader: {
    marginLeft: 8,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.successScale[50],
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successScale[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentLocationTextContainer: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.green,
  },
  currentLocationSubtitle: {
    fontSize: 13,
    color: colors.neutral[600],
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    fontSize: 12,
    color: colors.neutral[400],
    marginHorizontal: 12,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultAddress: {
    fontSize: 15,
    color: colors.neutral[800],
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 4,
  },
  // Details Form Styles
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectedLocationCard: {
    flexDirection: 'row',
    backgroundColor: colors.successScale[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  selectedLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successScale[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationLabel: {
    fontSize: 12,
    color: colors.brand.green,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 15,
    color: colors.neutral[800],
    fontWeight: '500',
    lineHeight: 20,
  },
  selectedLocationMeta: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  optionalSection: {
    marginTop: 24,
  },
  optionalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  optionalSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  inputIcon: {
    marginRight: 10,
  },
  detailInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[800],
    paddingVertical: 0,
  },
  actionButtons: {
    marginTop: 24,
    marginBottom: 32,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.green,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
    marginLeft: 8,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  locationHintText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default React.memo(LocationPickerModal);
