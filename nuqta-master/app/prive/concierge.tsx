import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import usePriveEligibility from '@/hooks/usePriveEligibility';
import priveApi from '@/services/priveApi';
import { ChatSkeleton } from '@/components/skeletons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

function ConciergeScreen() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { tier } = usePriveEligibility();
  const tierRank: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };

  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await priveApi.getConciergeTickets();
      if (response.success && response.data) {
        setTickets(response.data.tickets || response.data || []);
      }
    } catch (e) { catchAndReport(e, setError, 'Concierge/fetchTickets'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchTickets();
  }, [fetchTickets, isAuthenticated, authLoading]);
  const onRefresh = () => { setIsRefreshing(true); fetchTickets(); };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await priveApi.createConciergeTicket({
        subject: subject.trim(),
        category: 'prive_concierge',
        message: message.trim(),
      });
      if (res.success) {
        if (!isMounted()) return;
        setSubject('');
        if (!isMounted()) return;
        setMessage('');
        if (!isMounted()) return;
        setShowForm(false);
        await fetchTickets();
      }
    } catch (e) { catchAndReport(e, setError, 'Concierge/submitTicket'); }
    finally { setIsSubmitting(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return PRIVE_COLORS.status.info;
      case 'in_progress': return PRIVE_COLORS.status.warning;
      case 'resolved': case 'closed': return PRIVE_COLORS.status.success;
      default: return PRIVE_COLORS.text.tertiary;
    }
  };

  if (tierRank[tier] < 2) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <PriveEmptyState
          icon="◆"
          title="Concierge is available for Signature and Elite members"
          subtitle="Upgrade your tier to access priority concierge support"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <ChatSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>◆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Prive Concierge</Text>
            <Text style={styles.infoSubtitle}>Priority support for Prive members. Response times vary by tier.</Text>
          </View>
        </View>

        {/* New Ticket Button / Form */}
        {!showForm ? (
          <Pressable style={styles.newTicketBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.newTicketText}>+ New Support Request</Text>
          </Pressable>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Support Request</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor={PRIVE_COLORS.text.tertiary}
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue..."
              placeholderTextColor={PRIVE_COLORS.text.tertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, (!subject.trim() || !message.trim()) && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || !subject.trim() || !message.trim()}
              >
                <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Ticket History */}
        <Text style={styles.sectionTitle}>Your Tickets</Text>
        {tickets.length === 0 ? (
          <PriveEmptyState icon="◆" title="No tickets yet" subtitle="Your support history will appear here" />
        ) : (
          tickets.map((ticket: any) => (
            <View key={ticket._id || ticket.ticketNumber} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ticket.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                    {ticket.status?.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              {ticket.ticketNumber && (
                <Text style={styles.ticketNumber}>#{ticket.ticketNumber}</Text>
              )}
              {ticket.lastMessage && (
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {typeof ticket.lastMessage === 'string' ? ticket.lastMessage : ticket.lastMessage.message}
                </Text>
              )}
              <Text style={styles.ticketDate}>
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.xl },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  infoIcon: { fontSize: 24, color: PRIVE_COLORS.gold.primary },
  infoTitle: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.text.primary },
  infoSubtitle: { fontSize: 12, color: PRIVE_COLORS.text.tertiary, marginTop: 2 },
  newTicketBtn: {
    paddingVertical: PRIVE_SPACING.lg,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderRadius: PRIVE_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
    marginBottom: PRIVE_SPACING.xl,
  },
  newTicketText: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.gold.primary },
  formCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.xl,
  },
  formTitle: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.text.primary, marginBottom: PRIVE_SPACING.lg },
  input: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.lg,
    color: PRIVE_COLORS.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  textArea: { minHeight: 100 },
  formActions: { flexDirection: 'row', gap: PRIVE_SPACING.md, marginTop: PRIVE_SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: PRIVE_SPACING.md, alignItems: 'center' },
  cancelText: { fontSize: 14, color: PRIVE_COLORS.text.tertiary },
  submitBtn: {
    flex: 2,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.midGrayAlt },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.text.primary, marginBottom: PRIVE_SPACING.lg },
  ticketCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: PRIVE_SPACING.sm },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.text.primary, flex: 1, marginRight: PRIVE_SPACING.sm },
  statusBadge: { paddingHorizontal: PRIVE_SPACING.sm, paddingVertical: 2, borderRadius: PRIVE_RADIUS.sm },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ticketNumber: { fontSize: 11, color: PRIVE_COLORS.text.tertiary, marginBottom: PRIVE_SPACING.sm },
  lastMessage: { fontSize: 12, color: PRIVE_COLORS.text.secondary, marginBottom: PRIVE_SPACING.sm },
  ticketDate: { fontSize: 11, color: PRIVE_COLORS.text.tertiary },
});

export default withErrorBoundary(ConciergeScreen, 'PriveConcierge');
