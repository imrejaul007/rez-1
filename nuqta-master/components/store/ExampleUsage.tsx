// @ts-nocheck
/**
 * Example Usage File for StorePolicies and StoreContact Components
 *
 * This file demonstrates various ways to integrate and use the store components
 * in your React Native application.
 */

import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import StorePolicies, { StorePolicy, MOCK_POLICIES } from './StorePolicies';
import StoreContact, { StoreContactInfo, MOCK_CONTACT_INFO } from './StoreContact';
import StoreInfoModal from './StoreInfoModal';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================================================
// EXAMPLE 1: Basic Usage with Mock Data
// ============================================================================

export const BasicExample = () => {
  return (
    <View style={styles.container}>
      {/* Policies Component */}
      <StorePolicies
        storeId="store-123"
        policies={MOCK_POLICIES}
        storeType="product"
      />

      {/* Contact Component */}
      <StoreContact
        contact={MOCK_CONTACT_INFO}
        storeName="Fashion Store"
      />
    </View>
  );
};

// ============================================================================
// EXAMPLE 2: Using StoreInfoModal (Complete Integration)
// ============================================================================

export const ModalExample = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const isMounted = useIsMounted();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>View Store Information</Text>
      </Pressable>

      <StoreInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        storeId="store-123"
        storeName="Fashion Store"
        storeDescription="Welcome to our premium fashion store offering the latest trends and styles."
        policies={MOCK_POLICIES}
        contact={MOCK_CONTACT_INFO}
        storeType="product"
        defaultTab="about"
      />
    </View>
  );
};

// ============================================================================
// EXAMPLE 3: Custom Policies Data
// ============================================================================

export const CustomPoliciesExample = () => {
  const customPolicies: StorePolicy[] = [
    {
      id: '1',
      title: 'Service Booking Policy',
      content: `You can book our services online or by phone. Advanced booking is recommended.

Booking Requirements:
- Valid ID proof
- Advance payment of 50%
- 24-hour cancellation notice

Rescheduling:
- Can be done up to 12 hours before appointment
- No charges for rescheduling
- Subject to availability`,
      icon: 'calendar',
      lastUpdated: 'Jan 20, 2025',
    },
    {
      id: '2',
      title: 'COVID-19 Safety Policy',
      content: `We prioritize your safety with strict COVID-19 protocols.

Safety Measures:
- Mandatory masks for staff and customers
- Temperature checks at entry
- Regular sanitization
- Social distancing maintained
- Contactless payment options available

Please cooperate with our safety guidelines to ensure everyone's wellbeing.`,
      icon: 'shield-checkmark',
      lastUpdated: 'Jan 15, 2025',
    },
  ];

  return (
    <StorePolicies
      storeId="service-store-456"
      policies={customPolicies}
      storeType="service"
    />
  );
};

// ============================================================================
// EXAMPLE 4: Custom Contact Information
// ============================================================================

export const CustomContactExample = () => {
  const customContact: StoreContactInfo = {
    phone: '+91 99999 88888',
    email: 'hello@mystore.com',
    whatsapp: '+919999988888',
    website: 'www.mystore.com',
    socialMedia: {
      facebook: 'https://facebook.com/mystore',
      instagram: 'https://instagram.com/mystore',
      twitter: 'https://twitter.com/mystore',
    },
    address: {
      street: '456 Shopping Plaza',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      fullAddress: '456 Shopping Plaza, Connaught Place, Delhi 110001',
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
    },
    workingHours: {
      monday: '9:00 AM - 8:00 PM',
      tuesday: '9:00 AM - 8:00 PM',
      wednesday: '9:00 AM - 8:00 PM',
      thursday: '9:00 AM - 8:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '10:00 AM - 9:00 PM',
      sunday: 'Closed',
    },
  };

  return (
    <StoreContact
      contact={customContact}
      storeName="My Store"
    />
  );
};

// ============================================================================
// EXAMPLE 5: Integration in Store Details Page
// ============================================================================

export const StoreDetailsPageExample = ({ storeData }: any) => {
  const [activeSection, setActiveSection] = useState<'info' | 'policies' | 'contact'>('info');

  return (
    <View style={styles.container}>
      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <Pressable
          style={[styles.sectionTab, activeSection === 'info' && styles.activeSectionTab]}
          onPress={() => setActiveSection('info')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'info' && styles.activeSectionTabText]}>
            Info
          </Text>
        </Pressable>

        <Pressable
          style={[styles.sectionTab, activeSection === 'policies' && styles.activeSectionTab]}
          onPress={() => setActiveSection('policies')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'policies' && styles.activeSectionTabText]}>
            Policies
          </Text>
        </Pressable>

        <Pressable
          style={[styles.sectionTab, activeSection === 'contact' && styles.activeSectionTab]}
          onPress={() => setActiveSection('contact')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'contact' && styles.activeSectionTabText]}>
            Contact
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeSection === 'info' && (
        <View>
          <Text>Store Information Content</Text>
        </View>
      )}

      {activeSection === 'policies' && (
        <StorePolicies
          storeId={storeData.id}
          policies={storeData.policies || MOCK_POLICIES}
          storeType={storeData.type}
        />
      )}

      {activeSection === 'contact' && (
        <StoreContact
          contact={storeData.contact || MOCK_CONTACT_INFO}
          storeName={storeData.name}
        />
      )}
    </View>
  );
};

// ============================================================================
// EXAMPLE 6: With API Data Fetching
// ============================================================================

export const APIIntegrationExample = ({ storeId }: { storeId: string }) => {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [contact, setContact] = useState<StoreContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchStoreData();
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      // Fetch policies
      const policiesResponse = await fetch(`/api/stores/${storeId}/policies`);
      const policiesData = await policiesResponse.json();
      if (!isMounted()) return;
      setPolicies(policiesData);

      // Fetch contact
      const contactResponse = await fetch(`/api/stores/${storeId}/contact`);
      const contactData = await contactResponse.json();
      if (!isMounted()) return;
      setContact(contactData);

    } catch (error) {
      // Fallback to mock data
      if (!isMounted()) return;
      setPolicies(MOCK_POLICIES);
      setContact(MOCK_CONTACT_INFO);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      {contact && (
        <StoreContact
          contact={contact}
          storeName="Store Name"
        />
      )}

      {policies.length > 0 && (
        <StorePolicies
          storeId={storeId}
          policies={policies}
          storeType="hybrid"
        />
      )}
    </View>
  );
};

// ============================================================================
// EXAMPLE 7: In Bottom Sheet
// ============================================================================

export const BottomSheetExample = () => {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setSheetVisible(true)}>
        <Text>Show Store Info</Text>
      </Pressable>

      {/* Using a bottom sheet library like @gorhom/bottom-sheet */}
      {sheetVisible && (
        <View style={styles.bottomSheet}>
          <StorePolicies
            storeId="store-123"
            policies={MOCK_POLICIES}
            storeType="product"
          />
        </View>
      )}
    </View>
  );
};

// ============================================================================
// EXAMPLE 8: Minimal Contact Info (Only Phone & Email)
// ============================================================================

export const MinimalContactExample = () => {
  const minimalContact: StoreContactInfo = {
    phone: '+91 98765 43210',
    email: 'support@store.com',
  };

  return (
    <StoreContact
      contact={minimalContact}
      storeName="Small Store"
    />
  );
};

// ============================================================================
// EXAMPLE 9: Restaurant with Working Hours Focus
// ============================================================================

export const RestaurantExample = () => {
  const restaurantContact: StoreContactInfo = {
    phone: '+91 88888 77777',
    email: 'orders@restaurant.com',
    website: 'www.restaurant.com',
    address: {
      street: '789 Food Street',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      fullAddress: '789 Food Street, MG Road, Bangalore, Karnataka 560001',
    },
    workingHours: {
      monday: '11:00 AM - 11:00 PM',
      tuesday: '11:00 AM - 11:00 PM',
      wednesday: '11:00 AM - 11:00 PM',
      thursday: '11:00 AM - 11:00 PM',
      friday: '11:00 AM - 12:00 AM',
      saturday: '11:00 AM - 12:00 AM',
      sunday: '11:00 AM - 11:00 PM',
    },
  };

  const restaurantPolicies: StorePolicy[] = [
    {
      id: '1',
      title: 'Reservation Policy',
      content: 'We accept reservations for parties of 4 or more. Walk-ins welcome based on availability.',
      icon: 'calendar',
      lastUpdated: 'Jan 15, 2025',
    },
    {
      id: '2',
      title: 'Food Safety Policy',
      content: 'We maintain highest standards of food safety and hygiene. All ingredients are fresh and sourced daily.',
      icon: 'shield-checkmark',
      lastUpdated: 'Jan 10, 2025',
    },
  ];

  return (
    <View>
      <StoreContact
        contact={restaurantContact}
        storeName="The Food Place"
      />
      <StorePolicies
        storeId="restaurant-123"
        policies={restaurantPolicies}
        storeType="restaurant"
      />
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: colors.brand.purple,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSectionTab: {
    borderBottomColor: colors.brand.purple,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeSectionTabText: {
    color: colors.brand.purple,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
});

// ============================================================================
// Export all examples
// ============================================================================

export default {
  BasicExample,
  ModalExample,
  CustomPoliciesExample,
  CustomContactExample,
  StoreDetailsPageExample,
  APIIntegrationExample,
  BottomSheetExample,
  MinimalContactExample,
  RestaurantExample,
};
