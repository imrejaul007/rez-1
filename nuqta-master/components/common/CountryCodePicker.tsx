// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

// Supported countries - India first as default
export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', dialCode: '+91', flag: '🇮🇳', name: 'India' },
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'CN', dialCode: '+86', flag: '🇨🇳', name: 'China' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'USA' },
  { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'UK' },
  { code: 'SA', dialCode: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'QA', dialCode: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'KW', dialCode: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: 'BH', dialCode: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: 'OM', dialCode: '+968', flag: '🇴🇲', name: 'Oman' },
];

interface CountryCodePickerProps {
  selectedCountry: CountryCode;
  onSelect: (country: CountryCode) => void;
  style?: any;
}

function CountryCodePicker({
  selectedCountry,
  onSelect,
  style,
}: CountryCodePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (country: CountryCode) => {
    onSelect(country);
    setModalVisible(false);
  };

  const renderCountryItem = ({ item }: { item: CountryCode }) => (
    <Pressable
      style={[
        styles.countryItem,
        item.code === selectedCountry.code && styles.countryItemSelected,
      ]}
      onPress={() => handleSelect(item)}
     
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryDialCode}>{item.dialCode}</Text>
      </View>
      {item.code === selectedCountry.code && (
        <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
      )}
    </Pressable>
  );

  return (
    <>
      <Pressable
        style={[styles.selector, style]}
        onPress={() => setModalVisible(true)}
       
      >
        <Text style={styles.selectorFlag}>{selectedCountry.flag}</Text>
        <Text style={styles.selectorDialCode}>{selectedCountry.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.gray[400]} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.nileBlue} />
              </Pressable>
            </View>

            <FlashList
              data={COUNTRY_CODES}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              estimatedItemSize={70}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
    gap: 6,
  },
  selectorFlag: {
    fontSize: 18,
  },
  selectorDialCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  countryItemSelected: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 14,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.nileBlue,
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 13,
    color: colors.gray[400],
  },
});

export default React.memo(CountryCodePicker);
