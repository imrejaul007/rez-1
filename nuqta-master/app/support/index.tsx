import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Support Hub Page
// Main customer support hub with quick actions, tickets, and FAQs

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Platform, RefreshControl, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import supportService, { SupportTicket, FAQ } from '@/services/supportApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, Gradients } from '@/constants/DesignSystem';
import { SectionListSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const EMERGENCY_PHONE = '1800-123-4567';

function SupportHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTickets, setActiveTickets] = useState<SupportTicket[]>([]);
  const [popularFAQs, setPopularFAQs] = useState<FAQ[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {} as { [key: string]: number },
    byCategory: {} as { [key: string]: number },
  });
  const isMounted = useIsMounted();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsResponse, summaryResponse, faqsResponse] = await Promise.all([
        supportService.getMyTickets({ status: 'open', limit: 5 }),
        supportService.getTicketsSummary(),
        supportService.getPopularFAQs(5),
      ]);

      if (ticketsResponse.success && ticketsResponse.data) {
        if (!isMounted()) return;
        setActiveTickets(ticketsResponse.data.tickets);
      }

      if (summaryResponse.success && summaryResponse.data) {
        if (!isMounted()) return;
        setSummary(summaryResponse.data);
      }

      if (faqsResponse.success && faqsResponse.data) {
        if (!isMounted()) return;
        setPopularFAQs(faqsResponse.data.faqs);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleBackPress = () => {
    // Check if there's a previous screen to go back to
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no previous screen (e.g., page was refreshed), navigate to account page
      router.push('/account' as any);
    }
  };

  const handleCreateTicket = () => {
    router.push('/support/create-ticket' as any);
  };

  const handleViewAllTickets = () => {
    router.push('/support/tickets' as any);
  };

  const handleViewAllFAQs = () => {
    router.push('/support/faq' as any);
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    router.push(`/support/ticket/${ticket._id}` as any);
  };

  const handleViewFAQ = (faq: FAQ) => {
    router.push(`/support/faq?id=${faq._id}` as any);
  };

  const handleQuickAction = (type: string) => {
    switch (type) {
      case 'order-issue':
        router.push('/support/create-ticket?category=order&subject=Order Issue' as any);
        break;
      case 'track-order':
        router.push('/tracking' as any);
        break;
      case 'payment-help':
        handleCreateTicket();
        break;
      case 'account-help':
        handleCreateTicket();
        break;
      default:
        handleCreateTicket();
    }
  };

  const handleEmergencySOS = () => {
    platformAlertConfirm(
      'Emergency Support',
      'This will create a high-priority support ticket and connect you to our support line immediately. Continue?',
      async () => {
        try {
          // Create a high-priority emergency ticket
          await supportService.createTicket({
            subject: 'EMERGENCY - Urgent Support Needed',
            category: 'other',
            priority: 'urgent',
            message: 'User triggered emergency SOS from Support Hub. Requires immediate assistance.',
          });
          platformAlertSimple(
            'Ticket Created',
            'A high-priority ticket has been created. Connecting you to support now...'
          );
        } catch {
          // Even if ticket creation fails, still attempt the call
        }
        // Open phone dialer for immediate call
        Linking.openURL(`tel:${EMERGENCY_PHONE}`).catch(() => {
          platformAlertSimple('Call Failed', `Please call ${EMERGENCY_PHONE} directly for emergency support.`);
        });
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.primary[500];
      case 'in_progress':
        return Colors.secondary[500];
      case 'waiting_customer':
        return Colors.warning;
      case 'resolved':
        return Colors.gray[600];
      case 'closed':
        return Colors.gray[400];
      default:
        return Colors.gray[600];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderQuickAction = (icon: string, label: string, color: string, action: string) => {
    return (
      <Pressable
        key={action}
        style={styles.quickActionCard}
        onPress={() => handleQuickAction(action)}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <ThemedText style={styles.quickActionLabel}>{label}</ThemedText>
      </Pressable>
    );
  };

  const renderTicketCard = (ticket: SupportTicket) => {
    const statusColor = getStatusColor(ticket.status);
    const lastMessage = ticket.messages[ticket.messages.length - 1];

    return (
      <Pressable
        key={ticket._id}
        style={styles.ticketCard}
        onPress={() => handleViewTicket(ticket)}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketTitleRow}>
            <ThemedText style={styles.ticketNumber}>{ticket.ticketNumber}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {ticket.status.replace('_', ' ')}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.ticketSubject} numberOfLines={1}>
            {ticket.subject}
          </ThemedText>
        </View>

        {lastMessage && (
          <ThemedText style={styles.lastMessage} numberOfLines={2}>
            {lastMessage.message}
          </ThemedText>
        )}

        <View style={styles.ticketFooter}>
          <View style={styles.ticketMeta}>
            <Ionicons name="time-outline" size={14} color={Colors.gray[600]} />
            <ThemedText style={styles.ticketDate}>{formatDate(ticket.updatedAt)}</ThemedText>
          </View>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{ticket.category}</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderFAQCard = (faq: FAQ) => {
    return (
      <Pressable
        key={faq._id}
        style={styles.faqCard}
        onPress={() => handleViewFAQ(faq)}
      >
        <View style={styles.faqIcon}>
          <Ionicons name="help-circle" size={24} color={Colors.secondary[500]} />
        </View>
        <View style={styles.faqContent}>
          <ThemedText style={styles.faqQuestion} numberOfLines={2}>
            {faq.question}
          </ThemedText>
          {faq.shortAnswer && (
            <ThemedText style={styles.faqShortAnswer} numberOfLines={1}>
              {faq.shortAnswer}
            </ThemedText>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.secondary[600]} translucent={true} />

        {/* Header */}
        <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Support</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ThemedText style={styles.headerSubtitle}>
          How can we help you today?
        </ThemedText>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Emergency SOS Button */}
        <View style={styles.section}>
          <Pressable style={styles.sosButton} onPress={handleEmergencySOS}>
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sosGradient}
            >
              <View style={styles.sosIconContainer}>
                <Ionicons name="warning-outline" size={24} color="#fff" />
              </View>
              <View style={styles.sosTextContainer}>
                <ThemedText style={styles.sosTitle}>Emergency Support</ThemedText>
                <ThemedText style={styles.sosSubtitle}>Immediate help for urgent issues</ThemedText>
              </View>
              <Ionicons name="call" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction('cube-outline', 'Order Issue', Colors.error, 'order-issue')}
            {renderQuickAction('location-outline', 'Track Order', Colors.secondary[500], 'track-order')}
            {renderQuickAction('card-outline', 'Payment Help', Colors.primary[500], 'payment-help')}
            {renderQuickAction('person-outline', 'Account Help', Colors.warning, 'account-help')}
          </View>
        </View>

        {/* Get Help */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Get Help</ThemedText>
          <View style={styles.helpOptionsGrid}>
            <Pressable style={styles.helpOptionCard} onPress={() => router.push('/support/call')}>
              <View style={[styles.helpOptionIcon, { backgroundColor: `${Colors.primary[500]}20` }]}>
                <Ionicons name="call" size={24} color={Colors.primary[500]} />
              </View>
              <ThemedText style={styles.helpOptionLabel}>Call Support</ThemedText>
              <ThemedText style={styles.helpOptionDesc}>Talk to us directly</ThemedText>
            </Pressable>
            <Pressable style={styles.helpOptionCard} onPress={() => router.push('/support/feedback')}>
              <View style={[styles.helpOptionIcon, { backgroundColor: `${Colors.secondary[500]}20` }]}>
                <Ionicons name="chatbox" size={24} color={Colors.secondary[500]} />
              </View>
              <ThemedText style={styles.helpOptionLabel}>Feedback</ThemedText>
              <ThemedText style={styles.helpOptionDesc}>Share your thoughts</ThemedText>
            </Pressable>
            <Pressable style={styles.helpOptionCard} onPress={() => router.push('/support/report-fraud')}>
              <View style={[styles.helpOptionIcon, { backgroundColor: `${Colors.error}20` }]}>
                <Ionicons name="warning" size={24} color={Colors.error} />
              </View>
              <ThemedText style={styles.helpOptionLabel}>Report Fraud</ThemedText>
              <ThemedText style={styles.helpOptionDesc}>Suspicious activity</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Active Tickets Summary */}
        {summary.total > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Your Tickets</ThemedText>
              <Pressable onPress={handleViewAllTickets}>
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
              </Pressable>
            </View>

            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryValue}>{summary.total}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Total</ThemedText>
              </View>
              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryValue}>
                  {summary.byStatus['open'] || 0}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Open</ThemedText>
              </View>
              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryValue}>
                  {summary.byStatus['resolved'] || 0}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Resolved</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Active Tickets */}
        {activeTickets.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Active Tickets</ThemedText>
            {activeTickets.map(renderTicketCard)}
          </View>
        )}

        {/* Create Ticket Button */}
        <Pressable style={styles.createTicketButton} onPress={handleCreateTicket}>
          <LinearGradient
            colors={Gradients.nileBlue}
            style={styles.createTicketGradient}
          >
            <Ionicons name="add-circle" size={24} color={colors.background.primary} />
            <ThemedText style={styles.createTicketText}>Create New Ticket</ThemedText>
          </LinearGradient>
        </Pressable>

        {/* Popular FAQs */}
        {popularFAQs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Popular FAQs</ThemedText>
              <Pressable onPress={handleViewAllFAQs}>
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
              </Pressable>
            </View>
            {popularFAQs.map(renderFAQCard)}
          </View>
        )}

        {/* Contact Options */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Other Ways to Reach Us</ThemedText>
          <View style={styles.contactCard}>
            <Ionicons name="mail-outline" size={24} color={Colors.secondary[600]} />
            <View style={styles.contactContent}>
              <ThemedText style={styles.contactTitle}>Email Support</ThemedText>
              <ThemedText style={styles.contactValue}>support@rezapp.com</ThemedText>
            </View>
          </View>
          <View style={styles.contactCard}>
            <Ionicons name="call-outline" size={24} color={Colors.secondary[600]} />
            <View style={styles.contactContent}>
              <ThemedText style={styles.contactTitle}>Phone Support</ThemedText>
              <ThemedText style={styles.contactValue}>1800-123-4567</ThemedText>
            </View>
          </View>
          <View style={styles.contactCard}>
            <Ionicons name="time-outline" size={24} color={Colors.secondary[600]} />
            <View style={styles.contactContent}>
              <ThemedText style={styles.contactTitle}>Support Hours</ThemedText>
              <ThemedText style={styles.contactValue}>Mon-Sat, 9 AM - 6 PM</ThemedText>
            </View>
          </View>
        </View>

        {loading && (
          <SectionListSkeleton />
        )}
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.background.primary,
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  helpOptionCard: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  helpOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.secondary[600],
  },
  helpOptionDesc: {
    fontSize: 10,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 2,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.secondary[600],
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.gray[600],
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ticketHeader: {
    marginBottom: 12,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  categoryBadge: {
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.gray[600],
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  createTicketButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createTicketGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  createTicketText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  faqCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  faqIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.secondary[50],
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  faqShortAnswer: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  sosButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sosGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sosIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sosSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});

export default withErrorBoundary(SupportHubPage, 'SupportIndex');
