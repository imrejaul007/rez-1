import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StorePolicies, { StorePolicy, MOCK_POLICIES } from './StorePolicies';
import StoreContact, { StoreContactInfo, MOCK_CONTACT_INFO } from './StoreContact';
import { colors } from '@/constants/theme';

export interface StoreInfoModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  storeDescription?: string;
  policies?: StorePolicy[];
  contact?: StoreContactInfo;
  storeType?: 'product' | 'service' | 'restaurant' | 'hybrid';
  defaultTab?: 'about' | 'policies' | 'contact';
}

type TabType = 'about' | 'policies' | 'contact';

const StoreInfoModal: React.FC<StoreInfoModalProps> = ({
  visible,
  onClose,
  storeId,
  storeName,
  storeDescription = 'Welcome to our store! We offer quality products and services.',
  policies = MOCK_POLICIES,
  contact = MOCK_CONTACT_INFO,
  storeType = 'hybrid',
  defaultTab = 'about',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const renderTabButton = (tab: TabType, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const isActive = activeTab === tab;

    return (
      <Pressable
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => setActiveTab(tab)}
       
      >
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? colors.brand.purple : colors.midGray}
        />
        <Text style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderAboutTab = () => (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutHeader}>
        <View style={styles.storeIconContainer}>
          <Ionicons name="storefront" size={32} color={colors.brand.purple} />
        </View>
        <View style={styles.storeHeaderInfo}>
          <Text style={styles.storeNameText}>{storeName}</Text>
          <View style={styles.storeTypeContainer}>
            <View style={styles.storeTypeBadge}>
              <Text style={styles.storeTypeText}>
                {storeType.charAt(0).toUpperCase() + storeType.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About Us</Text>
        <Text style={styles.descriptionText}>{storeDescription}</Text>
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <Pressable
            style={styles.quickActionCard}
            onPress={() => setActiveTab('contact')}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.greenMist }]}>
              <Ionicons name="call" size={24} color={colors.brand.emerald} />
            </View>
            <Text style={styles.quickActionLabel}>Contact</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
            onPress={() => setActiveTab('policies')}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="document-text" size={24} color="#FF9800" />
            </View>
            <Text style={styles.quickActionLabel}>Policies</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="location" size={24} color="#2196F3" />
            </View>
            <Text style={styles.quickActionLabel}>Locate</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="share-social" size={24} color="#E91E63" />
            </View>
            <Text style={styles.quickActionLabel}>Share</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Store Features</Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand.emerald} />
            <Text style={styles.featureText}>Easy Returns & Exchanges</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand.emerald} />
            <Text style={styles.featureText}>Secure Payment Options</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand.emerald} />
            <Text style={styles.featureText}>Fast Delivery Available</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand.emerald} />
            <Text style={styles.featureText}>Customer Support 24/7</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
           
          >
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Store Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {renderTabButton('about', 'About', 'information-circle')}
          {renderTabButton('policies', 'Policies', 'document-text')}
          {renderTabButton('contact', 'Contact', 'call')}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'policies' && (
            <StorePolicies
              storeId={storeId}
              policies={policies}
              storeType={storeType}
            />
          )}
          {activeTab === 'contact' && (
            <StoreContact
              contact={contact}
              storeName={storeName}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: colors.background.primary,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: colors.tint.pink,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: colors.brand.purple,
  },
  content: {
    flex: 1,
  },
  aboutContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  storeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tint.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  storeNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  storeTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeTypeBadge: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storeTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
    textTransform: 'uppercase',
  },
  aboutSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  quickActionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '23%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    textAlign: 'center',
  },
  featuresSection: {
    padding: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 12,
  },
});

export default React.memo(StoreInfoModal);
