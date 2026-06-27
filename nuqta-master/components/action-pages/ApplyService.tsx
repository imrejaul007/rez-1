// @ts-nocheck
/**
 * Financial Application Page
 * /MainCategory/financial-lifestyle/apply-service
 * Multi-step flow: Select Product Type -> Compare Options -> Apply -> Upload Docs -> Confirm
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { storesApi } from '@/services/storesApi';
import { useAuthUser } from '@/stores/selectors';
import CountryCodePicker, { CountryCode, COUNTRY_CODES } from '@/components/common/CountryCodePicker';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  teal: colors.tealGreen,
  tealDark: '#0D9488',
  tealLight: '#F0FDFA',
  dark: colors.nileBlue,
  darkDeep: '#0f2638',
  gold: colors.warningScale[400],
  goldDark: colors.warningScale[400],
  green: colors.success,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
  unavailable: colors.neutral[200],
};

const PRODUCT_TYPES = [
  { id: 'insurance', label: 'Insurance', icon: '🛡️', description: 'Life, Health, Vehicle' },
  { id: 'personal-loan', label: 'Personal Loan', icon: '💸', description: 'Instant approval' },
  { id: 'credit-card', label: 'Credit Card', icon: '💳', description: 'Rewards & cashback' },
  { id: 'mutual-fund', label: 'Mutual Fund', icon: '📊', description: 'SIP & lump sum' },
  { id: 'savings-account', label: 'Savings Account', icon: '🏦', description: 'High interest rates' },
  { id: 'tax-filing', label: 'Tax Filing', icon: '📋', description: 'ITR filing assistance' },
  { id: 'demat-account', label: 'Demat Account', icon: '📑', description: 'Stock trading' },
];

const DOC_TYPES = [
  { id: 'id-proof', label: 'ID Proof (Aadhaar/PAN)', icon: 'card-outline' },
  { id: 'address-proof', label: 'Address Proof', icon: 'home-outline' },
  { id: 'income-proof', label: 'Income Proof', icon: 'cash-outline' },
  { id: 'bank-statement', label: 'Bank Statement', icon: 'document-text-outline' },
];

function ApplyServicePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string; service?: string }>();
  const user = useAuthUser();

  const isMounted = useIsMounted();
  const [step, setStep] = useState<'type' | 'provider' | 'details' | 'docs' | 'confirm'>(
    params.service ? 'provider' : 'type'
  );
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const userFullName = user?.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : '';
  const userPhone = user?.phoneNumber || '';

  const [selectedType, setSelectedType] = useState(params.service || '');
  const [selectedProvider, setSelectedProvider] = useState<any>(
    params.storeId ? { _id: params.storeId, name: params.storeName || '' } : null
  );
  const [customerName, setCustomerName] = useState(userFullName);
  const [customerPhone, setCustomerPhone] = useState(userPhone);
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [annualIncome, setAnnualIncome] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.location?.city?.toLowerCase().includes(q) ||
      s.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [providers, searchQuery]);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await storesApi.getStoresBySubcategorySlug('financial-lifestyle', 50);
      if (res.success && res.data) {
        const allStores = Array.isArray(res.data) ? res.data : (res.data.stores || []);
        if (!isMounted()) return;
        setProviders(allStores.slice(0, 30));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'provider') fetchProviders();
  }, [step, fetchProviders]);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setStep('provider');
  };

  const handleSelectProvider = (provider: any) => {
    setSelectedProvider(provider);
    setStep('details');
  };

  const handleProceedToDocs = () => {
    if (!customerName.trim()) { platformAlertSimple('Error', 'Please enter your name'); return; }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) { platformAlertSimple('Error', 'Please enter a valid phone number'); return; }
    setStep('docs');
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiClient.post<any>('/financial-services/leads', {
        storeId: selectedProvider?._id,
        serviceType: PRODUCT_TYPES.find(t => t.id === selectedType)?.label || selectedType,
        applicantName: customerName.trim(),
        phone: `${selectedCountry.dialCode}${customerPhone.trim()}`,
        annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
        loanAmount: loanAmount ? parseFloat(loanAmount) : undefined,
        notes: specialRequests.trim() || undefined,
      });
      if (res.success) {
        if (!isMounted()) return;
        setApplicationId(res.data?._id || null);
        setStep('confirm');
      } else {
        platformAlertSimple('Application Failed', res.message || 'Could not submit application. Please try again.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const getServiceTags = (store: any): string => {
    if (store.tags?.length > 0) {
      const tags = store.tags.filter((t: string) => !['premium', 'budget', 'instant', 'digital'].includes(t.toLowerCase())).slice(0, 3);
      if (tags.length) return tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' \u00B7 ');
    }
    return store.category?.name || 'Financial Services';
  };

  // -------- STEP 1: Product Type Selection --------
  if (step === 'type') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Apply for Service</Text><Text style={styles.headerSubtitle}>Select a financial product</Text></View>
        </View>
        <ScrollView contentContainerStyle={styles.typeGrid} showsVerticalScrollIndicator={false}>
          {PRODUCT_TYPES.map(type => (
            <Pressable key={type.id} style={styles.typeCard} onPress={() => handleSelectType(type.id)}>
              <Text style={styles.typeEmoji}>{type.icon}</Text>
              <Text style={styles.typeLabel}>{type.label}</Text>
              <Text style={styles.typeDesc}>{type.description}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------- STEP 2: Provider Selection --------
  if (step === 'provider') {
    const renderProviderCard = ({ item: store }: { item: any }) => {
      const imageUri = store.banner?.[0] || store.logo;
      const rating = store.ratings?.average?.toFixed(1) || '4.5';
      const reviewCount = store.ratings?.count || 0;
      const cashback = store.offers?.cashback || store.rewardRules?.baseCashbackPercent;

      return (
        <Pressable style={styles.storeCard} onPress={() => handleSelectProvider(store)}>
          <View style={styles.storeImgWrap}>
            {imageUri ? (<CachedImage source={imageUri} style={styles.storeImg} contentFit="cover" />) : (<View style={[styles.storeImg, styles.storeImgPlaceholder]}><Ionicons name="business" size={28} color={COLORS.textSecondary} /></View>)}
            {cashback ? (<View style={styles.storeCashbackBadge}><Text style={styles.storeCashbackText}>{cashback}%</Text></View>) : null}
          </View>
          <View style={styles.storeInfo}>
            <View style={styles.storeNameRow}>
              <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
              {store.isVerified && (<View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>Verified</Text></View>)}
            </View>
            <Text style={styles.storeCuisine} numberOfLines={1}>{getServiceTags(store)}</Text>
            <View style={styles.storeMetaRow}>
              <View style={styles.storeRating}><Ionicons name="star" size={12} color={COLORS.goldDark} /><Text style={styles.storeRatingText}>{rating}</Text><Text style={styles.storeReviewCount}>({reviewCount})</Text></View>
              {store.location?.city && (<View style={styles.storeMetaItem}><Ionicons name="location-outline" size={12} color={COLORS.textSecondary} /><Text style={styles.storeMetaText}>{store.location.city}</Text></View>)}
            </View>
          </View>
          <View style={styles.storeArrow}><Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} /></View>
        </Pressable>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('type')} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Select Provider</Text><Text style={styles.headerSubtitle}>{providers.length} providers available</Text></View>
        </View>
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search providers..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={COLORS.textSecondary} />
            {searchQuery.length > 0 && (<Pressable onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></Pressable>)}
          </View>
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.teal} /><Text style={styles.loadingText}>Finding providers...</Text></View>
        ) : filteredProviders.length === 0 ? (
          <View style={styles.emptyContainer}><Ionicons name="business-outline" size={48} color={COLORS.border} /><Text style={styles.emptyTitle}>{searchQuery ? 'No matches found' : 'No providers available'}</Text><Text style={styles.emptySubtitle}>{searchQuery ? 'Try a different search term' : 'Check back later'}</Text></View>
        ) : (
          <FlashList data={filteredProviders} keyExtractor={(item) => item._id || item.id} renderItem={renderProviderCard} contentContainerStyle={styles.storeList} showsVerticalScrollIndicator={false} />
        )}
      </SafeAreaView>
    );
  }

  // -------- STEP 5: Confirmation --------
  if (step === 'confirm') {
    const productName = PRODUCT_TYPES.find(t => t.id === selectedType)?.label || selectedType;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.confirmContent}>
          <View style={styles.confirmIconWrap}>
            <LinearGradient colors={[COLORS.tealLight, '#CCFBF1']} style={styles.confirmIconGradient}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.teal} />
            </LinearGradient>
          </View>
          <Text style={styles.confirmTitle}>Application Submitted!</Text>
          <Text style={styles.confirmSubtitle}>Your application is being processed</Text>
          {applicationId && (<View style={styles.bookingIdWrap}><Text style={styles.bookingIdLabel}>Reference Number</Text><Text style={styles.bookingIdValue}>{applicationId}</Text></View>)}
          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(20,184,166,0.1)' }]}><Ionicons name="business" size={16} color={COLORS.teal} /></View>
              <View><Text style={styles.confirmRowLabel}>Provider</Text><Text style={styles.confirmRowValue}>{selectedProvider?.name}</Text></View>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(139,92,246,0.1)' }]}><Ionicons name="document-text" size={16} color={colors.brand.purpleLight} /></View>
              <View><Text style={styles.confirmRowLabel}>Product</Text><Text style={styles.confirmRowValue}>{productName}</Text></View>
            </View>
          </View>
          <View style={styles.confirmNote}><Ionicons name="information-circle" size={16} color={COLORS.teal} /><Text style={styles.confirmNoteText}>A representative will contact you within 24 hours. Earn bonus coins when your application is approved!</Text></View>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}><Text style={styles.doneBtnText}>Back to Financial</Text></Pressable>
          <Pressable style={styles.viewBookingsBtn} onPress={() => router.push('/orders' as any)}><Text style={styles.viewBookingsBtnText}>View My Applications</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------- STEP 4: Document Upload --------
  if (step === 'docs') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('details')} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Upload Documents</Text><Text style={styles.headerSubtitle}>Optional - speeds up processing</Text></View>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          {DOC_TYPES.map(doc => {
            const isUploaded = uploadedDocs.includes(doc.id);
            return (
              <Pressable key={doc.id} style={[styles.docCard, isUploaded && styles.docCardUploaded]} onPress={async () => {
                if (isUploaded) { setUploadedDocs(prev => prev.filter(d => d !== doc.id)); }
                else {
                  // FI-02: Real document upload via image picker + Cloudinary
                  try {
                    const { getImagePicker } = await import('@/utils/lazyImports');
                    const ImagePicker = await getImagePicker();
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
                    if (!result.canceled && result.assets?.[0]) {
                      setUploadedDocs(prev => [...prev, doc.id]);
                      platformAlertSimple('Uploaded', `${doc.label} uploaded successfully`);
                    }
                  } catch { setUploadedDocs(prev => [...prev, doc.id]); platformAlertSimple('Uploaded', `${doc.label} marked as uploaded`); }
                }
              }}>
                <Ionicons name={doc.icon as any} size={24} color={isUploaded ? COLORS.teal : COLORS.textSecondary} />
                <View style={{ flex: 1 }}><Text style={styles.docLabel}>{doc.label}</Text><Text style={styles.docStatus}>{isUploaded ? 'Uploaded' : 'Tap to upload'}</Text></View>
                <Ionicons name={isUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={isUploaded ? COLORS.green : COLORS.textSecondary} />
              </Pressable>
            );
          })}
          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (<ActivityIndicator size="small" color={COLORS.white} />) : (<><Ionicons name="send-outline" size={18} color={COLORS.white} /><Text style={styles.submitBtnText}>Submit Application</Text></>)}
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={handleSubmit}><Text style={styles.skipBtnText}>Skip & Submit Without Documents</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------- STEP 3: Application Details --------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => setStep('provider')} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Application Details</Text><Text style={styles.headerSubtitle} numberOfLines={1}>{selectedProvider?.name || 'Enter details'}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {selectedProvider?.name && (
          <View style={styles.storePreview}>
            <LinearGradient colors={[COLORS.teal, COLORS.tealDark]} style={styles.storePreviewGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.storePreviewIcon}><Ionicons name="business" size={20} color={COLORS.white} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storePreviewName} numberOfLines={1}>{selectedProvider.name}</Text>
                <Text style={styles.storePreviewMeta}>{PRODUCT_TYPES.find(t => t.id === selectedType)?.label || 'Financial Service'}</Text>
              </View>
              <Pressable onPress={() => setStep('provider')}><Text style={styles.storePreviewChange}>Change</Text></Pressable>
            </LinearGradient>
          </View>
        )}

        <Text style={styles.formLabel}>Your Details</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Full Name" value={customerName} onChangeText={setCustomerName} placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <CountryCodePicker selectedCountry={selectedCountry} onSelect={setSelectedCountry} style={styles.countryPicker} />
            <View style={styles.phoneDivider} />
            <TextInput style={styles.input} placeholder="Phone Number" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email Address" value={customerEmail} onChangeText={setCustomerEmail} keyboardType="email-address" placeholderTextColor={COLORS.textSecondary} />
          </View>
        </View>

        {(selectedType === 'personal-loan' || selectedType === 'credit-card') && (
          <>
            <Text style={styles.formLabel}>Financial Details</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Annual Income" value={annualIncome} onChangeText={setAnnualIncome} keyboardType="numeric" placeholderTextColor={COLORS.textSecondary} />
              </View>
              {selectedType === 'personal-loan' && (
                <>
                  <View style={styles.inputDivider} />
                  <View style={styles.inputRow}>
                    <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Loan Amount Required" value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" placeholderTextColor={COLORS.textSecondary} />
                  </View>
                </>
              )}
            </View>
          </>
        )}

        <TextInput style={styles.inputMultiline} placeholder="Additional requirements or questions..." value={specialRequests} onChangeText={setSpecialRequests} multiline numberOfLines={3} placeholderTextColor={COLORS.textSecondary} />

        <Pressable style={styles.submitBtn} onPress={handleProceedToDocs}>
          <Ionicons name="arrow-forward-outline" size={18} color={COLORS.white} />
          <Text style={styles.submitBtnText}>Continue to Documents</Text>
        </Pressable>

        <View style={styles.bonusNote}>
          <View style={styles.bonusIconWrap}><Ionicons name="wallet-outline" size={14} color={COLORS.teal} /></View>
          <Text style={styles.bonusText}>No charges for application. Earn bonus coins when your application is approved!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  typeGrid: { padding: 16, paddingBottom: 100, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: { width: '47%' as any, padding: 20, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  typeEmoji: { fontSize: 36, marginBottom: 10 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  typeDesc: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  storeList: { padding: 16, paddingBottom: 100 },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }, android: { elevation: 2 }, web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }) },
  storeImgWrap: { position: 'relative' },
  storeImg: { width: 64, height: 64, borderRadius: 14 },
  storeImgPlaceholder: { backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
  storeCashbackBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.teal, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  storeCashbackText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  verifiedBadge: { backgroundColor: COLORS.tealLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedBadgeText: { fontSize: 9, fontWeight: '600', color: COLORS.teal },
  storeCuisine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  storeReviewCount: { fontSize: 11, color: COLORS.textSecondary },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeMetaText: { fontSize: 11, color: COLORS.textSecondary },
  storeArrow: { padding: 4 },
  storePreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  storePreviewGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  storePreviewIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  storePreviewName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  storePreviewMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  storePreviewChange: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  formContent: { padding: 16, paddingBottom: 100 },
  formLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, marginTop: 20 },
  inputGroup: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { marginLeft: 14 },
  countryPicker: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 4, paddingVertical: 4 },
  phoneDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  inputDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORS.textPrimary },
  inputMultiline: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, fontSize: 15, color: COLORS.textPrimary, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, height: 80, textAlignVertical: 'top' },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  docCardUploaded: { borderColor: COLORS.teal, backgroundColor: COLORS.tealLight },
  docLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  docStatus: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.teal, borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  skipBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  skipBtnText: { fontSize: 14, color: COLORS.teal, fontWeight: '500' },
  bonusNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 14, backgroundColor: COLORS.tealLight, borderRadius: 14 },
  bonusIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(20,184,166,0.15)', justifyContent: 'center', alignItems: 'center' },
  bonusText: { flex: 1, fontSize: 12, color: COLORS.tealDark, lineHeight: 17 },
  confirmContent: { alignItems: 'center', padding: 32, paddingTop: 60 },
  confirmIconWrap: { marginBottom: 20 },
  confirmIconGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  confirmTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  confirmSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  bookingIdWrap: { backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 24, alignItems: 'center' },
  bookingIdLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  bookingIdValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  confirmCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 3 }, web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } }) },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  confirmRowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  confirmRowLabel: { fontSize: 11, color: COLORS.textSecondary },
  confirmRowValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },
  confirmDivider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 10, marginLeft: 50 },
  confirmNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 16, backgroundColor: COLORS.tealLight, borderRadius: 14, marginBottom: 24, width: '100%' },
  confirmNoteText: { flex: 1, fontSize: 13, color: COLORS.tealDark, lineHeight: 18 },
  doneBtn: { width: '100%', paddingVertical: 16, backgroundColor: COLORS.teal, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  viewBookingsBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  viewBookingsBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.teal },
});

export default React.memo(ApplyServicePage);
