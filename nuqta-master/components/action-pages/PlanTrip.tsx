/**
 * Plan a Trip Page
 * /MainCategory/travel-experiences/plan-trip
 * Trip planning flow: Select Destination -> Pick Dates -> Travelers -> Accommodation -> Activities -> Confirm
 * Cyan themed
 */

import React, { useState, useCallback, useMemo } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertConfirm } from '@/utils/platformAlert';
import apiClient from '@/services/apiClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const COLORS = {
  cyan: colors.brand.cyan,
  cyanDark: colors.cyanDark,
  cyanLight: '#ECFEFF',
  dark: colors.nileBlue,
  gold: colors.warningScale[400],
  goldDark: colors.warningScale[400],
  green: colors.success,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
};

type Step = 'destination' | 'dates' | 'travelers' | 'accommodation' | 'activities' | 'confirm';

const POPULAR_DESTINATIONS = [
  { id: 'goa', name: 'Goa', emoji: '🏖️', tag: 'Beach' },
  { id: 'manali', name: 'Manali', emoji: '🏔️', tag: 'Mountains' },
  { id: 'kerala', name: 'Kerala', emoji: '🌴', tag: 'Backwaters' },
  { id: 'jaipur', name: 'Jaipur', emoji: '🏰', tag: 'Heritage' },
  { id: 'udaipur', name: 'Udaipur', emoji: '🕌', tag: 'Romance' },
  { id: 'rishikesh', name: 'Rishikesh', emoji: '🧘', tag: 'Adventure' },
  { id: 'ladakh', name: 'Ladakh', emoji: '🏔️', tag: 'Road Trip' },
  { id: 'andaman', name: 'Andaman', emoji: '🏝️', tag: 'Islands' },
  { id: 'dubai', name: 'Dubai', emoji: '🌃', tag: 'International' },
  { id: 'bali', name: 'Bali', emoji: '🌺', tag: 'International' },
  { id: 'thailand', name: 'Thailand', emoji: '🛕', tag: 'International' },
  { id: 'maldives', name: 'Maldives', emoji: '🐚', tag: 'Luxury' },
];

const ACCOMMODATION_TYPES = [
  { id: 'hotel', label: 'Hotel', emoji: '🏨', desc: 'Comfort & amenities' },
  { id: 'resort', label: 'Resort', emoji: '🏖️', desc: 'All-inclusive stay' },
  { id: 'homestay', label: 'Homestay', emoji: '🏡', desc: 'Local experience' },
  { id: 'hostel', label: 'Hostel', emoji: '🛏️', desc: 'Budget friendly' },
  { id: 'villa', label: 'Villa', emoji: '🏘️', desc: 'Private luxury' },
  { id: 'camping', label: 'Camping', emoji: '⛺', desc: 'Under the stars' },
];

const ACTIVITY_OPTIONS = [
  { id: 'sightseeing', label: 'Sightseeing', emoji: '📸' },
  { id: 'adventure', label: 'Adventure Sports', emoji: '🏄' },
  { id: 'food-tour', label: 'Food Tour', emoji: '🍜' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'spa', label: 'Spa & Wellness', emoji: '💆' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🎶' },
  { id: 'wildlife', label: 'Wildlife Safari', emoji: '🦁' },
  { id: 'trekking', label: 'Trekking', emoji: '🥾' },
  { id: 'water-sports', label: 'Water Sports', emoji: '🤿' },
  { id: 'cultural', label: 'Cultural Tours', emoji: '🏛️' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'yoga', label: 'Yoga Retreat', emoji: '🧘' },
];

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'destination', label: 'Destination', icon: '📍' },
  { key: 'dates', label: 'Dates', icon: '📅' },
  { key: 'travelers', label: 'Travelers', icon: '👥' },
  { key: 'accommodation', label: 'Stay', icon: '🏨' },
  { key: 'activities', label: 'Activities', icon: '🎯' },
  { key: 'confirm', label: 'Confirm', icon: '✅' },
];

function PlanTripPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [step, setStep] = useState<Step>('destination');
  const [destination, setDestination] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [tripDays, setTripDays] = useState(3);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [accommodation, setAccommodation] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const goNext = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const goBack = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
    else router.back();
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getDateOptions = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); dates.push(d); }
    return dates;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + tripDays - 1);
    return d;
  }, [startDate, tripDays]);

  const selectedDest = POPULAR_DESTINATIONS.find(d => d.id === destination);
  const destName = selectedDest?.name || customDestination || 'Not selected';

  const handleConfirm = async () => {
    // T-01: Save trip plan to backend (non-blocking)
    try {
      await apiClient.post('/travel-services/plan', {
        destination: destination || customDestination,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        tripDays,
        adults,
        children,
        accommodation,
        activities: selectedActivities,
      });
    } catch { /* non-blocking — plan is shown locally regardless */ }

    platformAlertConfirm(
      'Trip Planned!',
      `Your ${tripDays}-day trip to ${destName} has been saved. We'll find the best deals for you!`,
      () => router.push('/MainCategory/travel-experiences/offers' as any),
      'Browse Offers'
    );
  };

  const canProceed = () => {
    switch (step) {
      case 'destination': return !!destination || customDestination.trim().length > 0;
      case 'dates': return tripDays > 0;
      case 'travelers': return adults > 0;
      case 'accommodation': return !!accommodation;
      case 'activities': return selectedActivities.length > 0;
      default: return true;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Plan Your Trip</Text>
          <Text style={styles.headerSubtitle}>Step {stepIndex + 1} of {STEPS.length}</Text>
        </View>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={styles.progressStep}>
            <View style={[styles.progressDot, i <= stepIndex && styles.progressDotActive, i < stepIndex && styles.progressDotCompleted]}>
              {i < stepIndex ? <Ionicons name="checkmark" size={12} color={COLORS.white} /> : <Text style={[styles.progressDotText, i <= stepIndex && { color: COLORS.white }]}>{s.icon}</Text>}
            </View>
            <Text style={[styles.progressLabel, i === stepIndex && styles.progressLabelActive]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Destination */}
        {step === 'destination' && (
          <>
            <Text style={styles.stepTitle}>Where do you want to go?</Text>
            <TextInput style={styles.searchInput} placeholder="Search for a destination..." value={customDestination} onChangeText={(text) => { setCustomDestination(text); setDestination(''); }} placeholderTextColor={COLORS.textSecondary} />
            <Text style={styles.sectionLabel}>Popular Destinations</Text>
            <View style={styles.destinationGrid}>
              {POPULAR_DESTINATIONS.map(dest => {
                const isSelected = destination === dest.id;
                return (
                  <Pressable key={dest.id} style={[styles.destCard, isSelected && styles.destCardActive]} onPress={() => { setDestination(dest.id); setCustomDestination(''); }}>
                    <Text style={styles.destEmoji}>{dest.emoji}</Text>
                    <Text style={[styles.destName, isSelected && styles.destNameActive]}>{dest.name}</Text>
                    <Text style={[styles.destTag, isSelected && styles.destTagActive]}>{dest.tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Step 2: Dates */}
        {step === 'dates' && (
          <>
            <Text style={styles.stepTitle}>When are you traveling?</Text>
            <Text style={styles.sectionLabel}>Start Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {getDateOptions().map((date, i) => {
                const isSelected = date.toDateString() === startDate.toDateString();
                return (
                  <Pressable key={i} style={[styles.dateChip, isSelected && styles.dateChipActive]} onPress={() => setStartDate(date)}>
                    <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>{i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{date.getDate()}</Text>
                    <Text style={[styles.dateMonth, isSelected && styles.dateDayActive]}>{date.toLocaleDateString(undefined, { month: 'short' })}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Trip Duration</Text>
            <View style={styles.durationRow}>
              <Pressable style={styles.durationBtn} onPress={() => setTripDays(Math.max(1, tripDays - 1))}><Ionicons name="remove-circle" size={32} color={COLORS.cyan} /></Pressable>
              <View style={styles.durationDisplay}>
                <Text style={styles.durationValue}>{tripDays}</Text>
                <Text style={styles.durationLabel}>{tripDays === 1 ? 'day' : 'days'}</Text>
              </View>
              <Pressable style={styles.durationBtn} onPress={() => setTripDays(Math.min(30, tripDays + 1))}><Ionicons name="add-circle" size={32} color={COLORS.cyan} /></Pressable>
            </View>
            <View style={styles.quickDays}>
              {[2, 3, 5, 7, 10, 14].map(d => (
                <Pressable key={d} style={[styles.quickDayChip, tripDays === d && styles.quickDayChipActive]} onPress={() => setTripDays(d)}>
                  <Text style={[styles.quickDayText, tripDays === d && styles.quickDayTextActive]}>{d} days</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.dateSummary}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.cyan} />
              <Text style={styles.dateSummaryText}>{formatDate(startDate)} - {formatDate(endDate)}</Text>
            </View>
          </>
        )}

        {/* Step 3: Travelers */}
        {step === 'travelers' && (
          <>
            <Text style={styles.stepTitle}>Who's traveling?</Text>
            <View style={styles.travelerCard}>
              <View style={styles.travelerRow}>
                <View>
                  <Text style={styles.travelerLabel}>Adults</Text>
                  <Text style={styles.travelerDesc}>Age 13+</Text>
                </View>
                <View style={styles.counterRow}>
                  <Pressable style={styles.counterBtn} onPress={() => setAdults(Math.max(1, adults - 1))}><Ionicons name="remove" size={20} color={COLORS.cyan} /></Pressable>
                  <Text style={styles.counterValue}>{adults}</Text>
                  <Pressable style={styles.counterBtn} onPress={() => setAdults(Math.min(10, adults + 1))}><Ionicons name="add" size={20} color={COLORS.cyan} /></Pressable>
                </View>
              </View>
              <View style={styles.travelerDivider} />
              <View style={styles.travelerRow}>
                <View>
                  <Text style={styles.travelerLabel}>Children</Text>
                  <Text style={styles.travelerDesc}>Age 2-12</Text>
                </View>
                <View style={styles.counterRow}>
                  <Pressable style={styles.counterBtn} onPress={() => setChildren(Math.max(0, children - 1))}><Ionicons name="remove" size={20} color={COLORS.cyan} /></Pressable>
                  <Text style={styles.counterValue}>{children}</Text>
                  <Pressable style={styles.counterBtn} onPress={() => setChildren(Math.min(6, children + 1))}><Ionicons name="add" size={20} color={COLORS.cyan} /></Pressable>
                </View>
              </View>
            </View>
            <View style={styles.travelerSummary}>
              <Ionicons name="people-outline" size={18} color={COLORS.cyan} />
              <Text style={styles.travelerSummaryText}>{adults} adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}</Text>
            </View>
          </>
        )}

        {/* Step 4: Accommodation */}
        {step === 'accommodation' && (
          <>
            <Text style={styles.stepTitle}>Where would you like to stay?</Text>
            <View style={styles.accomGrid}>
              {ACCOMMODATION_TYPES.map(a => {
                const isSelected = accommodation === a.id;
                return (
                  <Pressable key={a.id} style={[styles.accomCard, isSelected && styles.accomCardActive]} onPress={() => setAccommodation(a.id)}>
                    <Text style={styles.accomEmoji}>{a.emoji}</Text>
                    <Text style={[styles.accomLabel, isSelected && styles.accomLabelActive]}>{a.label}</Text>
                    <Text style={[styles.accomDesc, isSelected && styles.accomDescActive]}>{a.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Step 5: Activities */}
        {step === 'activities' && (
          <>
            <Text style={styles.stepTitle}>What activities interest you?</Text>
            <Text style={styles.stepSubtitle}>Select one or more</Text>
            <View style={styles.activityGrid}>
              {ACTIVITY_OPTIONS.map(a => {
                const isSelected = selectedActivities.includes(a.id);
                return (
                  <Pressable key={a.id} style={[styles.activityChip, isSelected && styles.activityChipActive]} onPress={() => toggleActivity(a.id)}>
                    <Text style={styles.activityEmoji}>{a.emoji}</Text>
                    <Text style={[styles.activityLabel, isSelected && styles.activityLabelActive]}>{a.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Step 6: Confirm */}
        {step === 'confirm' && (
          <>
            <Text style={styles.stepTitle}>Your Trip Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Destination</Text><Text style={styles.summaryValue}>{destName}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Dates</Text><Text style={styles.summaryValue}>{formatDate(startDate)} - {formatDate(endDate)} ({tripDays} days)</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Travelers</Text><Text style={styles.summaryValue}>{adults} adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Accommodation</Text><Text style={styles.summaryValue}>{ACCOMMODATION_TYPES.find(a => a.id === accommodation)?.label || 'Not selected'}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Activities</Text><Text style={styles.summaryValue}>{selectedActivities.map(id => ACTIVITY_OPTIONS.find(a => a.id === id)?.label).join(', ') || 'None'}</Text></View>
            </View>
            <View style={styles.bonusNote}>
              <View style={styles.bonusIconWrap}><Ionicons name="wallet-outline" size={14} color={COLORS.cyan} /></View>
              <Text style={styles.bonusText}>{`Earn bonus ${BRAND.COIN_NAME} when you book through ${BRAND.APP_NAME}!`}</Text>
            </View>
          </>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navRow}>
          {step !== 'confirm' ? (
            <Pressable style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]} onPress={goNext} disabled={!canProceed()}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </Pressable>
          ) : (
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.confirmBtnText}>Confirm Trip</Text>
            </Pressable>
          )}
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
  progressBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { backgroundColor: COLORS.cyan },
  progressDotCompleted: { backgroundColor: COLORS.green },
  progressDotText: { fontSize: 12, color: COLORS.textSecondary },
  progressLabel: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '500' },
  progressLabelActive: { color: COLORS.cyan, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 100 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, marginTop: 16 },
  searchInput: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  destinationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  destCard: { width: '31%', padding: 12, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  destCardActive: { backgroundColor: COLORS.cyanLight, borderColor: COLORS.cyan },
  destEmoji: { fontSize: 28, marginBottom: 4 },
  destName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  destNameActive: { color: COLORS.cyanDark },
  destTag: { fontSize: 10, color: COLORS.textSecondary },
  destTagActive: { color: COLORS.cyan },
  dateScroll: { marginBottom: 4 },
  dateChip: { width: 64, height: 78, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  dateChipActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  dateDay: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, fontWeight: '500' },
  dateDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateNum: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dateNumActive: { color: COLORS.white },
  dateMonth: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 16 },
  durationBtn: { padding: 4 },
  durationDisplay: { alignItems: 'center' },
  durationValue: { fontSize: 36, fontWeight: '800', color: COLORS.cyan },
  durationLabel: { fontSize: 14, color: COLORS.textSecondary },
  quickDays: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickDayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  quickDayChipActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  quickDayText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  quickDayTextActive: { color: COLORS.white },
  dateSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: COLORS.cyanLight, borderRadius: 12 },
  dateSummaryText: { fontSize: 14, fontWeight: '600', color: COLORS.cyanDark },
  travelerCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginTop: 16 },
  travelerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  travelerLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  travelerDesc: { fontSize: 12, color: COLORS.textSecondary },
  travelerDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.cyanLight, justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  travelerSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: COLORS.cyanLight, borderRadius: 12 },
  travelerSummaryText: { fontSize: 14, fontWeight: '600', color: COLORS.cyanDark },
  accomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  accomCard: { width: '48%', padding: 16, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  accomCardActive: { backgroundColor: COLORS.cyanLight, borderColor: COLORS.cyan },
  accomEmoji: { fontSize: 32, marginBottom: 8 },
  accomLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  accomLabelActive: { color: COLORS.cyanDark },
  accomDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  accomDescActive: { color: COLORS.cyan },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  activityChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  activityChipActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  activityEmoji: { fontSize: 16 },
  activityLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  activityLabelActive: { color: COLORS.white },
  summaryCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, width: '35%' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 4 },
  bonusNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 14, backgroundColor: COLORS.cyanLight, borderRadius: 14 },
  bonusIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(6,182,212,0.15)', justifyContent: 'center', alignItems: 'center' },
  bonusText: { flex: 1, fontSize: 12, color: COLORS.cyanDark, lineHeight: 17 },
  navRow: { marginTop: 24 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.cyan, borderRadius: 16, paddingVertical: 16 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.green, borderRadius: 16, paddingVertical: 16 },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});

export default React.memo(PlanTripPage);
