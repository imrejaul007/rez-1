import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Support Ticket Detail Page
// View and interact with a support ticket (real API)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import supportService, { SupportTicket } from '@/services/supportApi';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function TicketDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const response = await supportService.getTicketById(id);
      if (response.success && response.data?.ticket) {
        setTicket(response.data.ticket);
      }
    } catch (error) {
      // silently handle
    }
  }, [id]);
  const isMounted = useIsMounted();

  useEffect(() => {
    setLoading(true);
    loadTicket().finally(() => setLoading(false));
  }, [loadTicket]);

  // Poll for new messages every 15s when ticket is active
  useEffect(() => {
    if (!ticket || ticket.status === 'closed') return;

    pollRef.current = setInterval(() => {
      loadTicket();
    }, 15000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ticket?.status, loadTicket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id || sending) return;

    setSending(true);
    try {
      const response = await supportService.addMessageToTicket(id, newMessage.trim());
      if (response.success && response.data?.ticket) {
        setTicket(response.data.ticket);
        setNewMessage('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      } else {
        platformAlertSimple('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSending(false);
    }
  };

  const handleCloseTicket = () => {
    platformAlertDestructive(
      'Close Ticket',
      'Are you sure you want to close this ticket? You can reopen it later if needed.',
      async () => {
        setClosing(true);
        try {
          const response = await supportService.closeTicket(id!);
          if (response.success && response.data?.ticket) {
            setTicket(response.data.ticket);
            platformAlertSimple('Ticket Closed', 'Your ticket has been closed.');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to close ticket.');
        } finally {
          if (!isMounted()) return;
          setClosing(false);
        }
      },
      'Close'
    );
  };

  const handleReopenTicket = () => {
    platformAlertConfirm(
      'Reopen Ticket',
      'Would you like to reopen this ticket? Our team will review it again.',
      async () => {
        setReopening(true);
        try {
          const response = await supportService.reopenTicket(id!, 'User requested to reopen the ticket');
          if (response.success && response.data?.ticket) {
            setTicket(response.data.ticket);
            platformAlertSimple('Ticket Reopened', 'Your ticket has been reopened.');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to reopen ticket.');
        } finally {
          if (!isMounted()) return;
          setReopening(false);
        }
      },
      'Reopen'
    );
  };

  const handleSubmitRating = async () => {
    if (ratingScore === 0 || !id) return;
    setSubmittingRating(true);
    try {
      const response = await supportService.rateTicket(id, ratingScore, ratingComment.trim() || undefined);
      if (response.success && response.data?.ticket) {
        setTicket(response.data.ticket);
        setShowRating(false);
        platformAlertSimple('Thank You', 'Your feedback helps us improve our support.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to submit rating.');
    } finally {
      if (!isMounted()) return;
      setSubmittingRating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return Colors.primary[500];
      case 'in_progress': return Colors.secondary[500];
      case 'waiting_customer': return Colors.warning;
      case 'resolved': return Colors.success;
      case 'closed': return Colors.gray[400];
      default: return Colors.gray[600];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'waiting_customer': return 'Waiting for Reply';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return (
      date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' ' +
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent />
          <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
            <View style={styles.headerContent}>
              <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>Loading...</ThemedText>
              </View>
              <View style={styles.moreButton} />
            </View>
          </LinearGradient>
          <View style={styles.skeletonContainer}>
            <SkeletonLoader width="70%" height={20} borderRadius={4} />
            <SkeletonLoader width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            <View style={{ marginTop: 24 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ marginBottom: 16, alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                  <SkeletonLoader width="70%" height={60} borderRadius={12} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent />
          <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
            <View style={styles.headerContent}>
              <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>Ticket Not Found</ThemedText>
              </View>
              <View style={styles.moreButton} />
            </View>
          </LinearGradient>
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[300]} />
            <ThemedText style={styles.emptyTitle}>Ticket Not Found</ThemedText>
            <ThemedText style={styles.emptyText}>
              This ticket may have been deleted or you don't have access to it.
            </ThemedText>
          </View>
        </View>
      </>
    );
  }

  const statusColor = getStatusColor(ticket.status);
  const isActive = ticket.status !== 'closed' && ticket.status !== 'resolved';
  const canRate = (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.rating;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent />

        {/* Header */}
        <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>#{ticket.ticketNumber}</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(ticket.status)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.moreButton} />
          </View>
        </LinearGradient>

        {/* Ticket Info */}
        <View style={styles.ticketInfo}>
          <ThemedText style={styles.ticketSubject}>{ticket.subject}</ThemedText>
          <View style={styles.ticketMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={14} color={Colors.gray[500]} />
              <ThemedText style={styles.metaText}>{ticket.category}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gray[500]} />
              <ThemedText style={styles.metaText}>
                Created {formatTime(ticket.createdAt)}
              </ThemedText>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {ticket.messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageWrapper,
                  msg.senderType === 'user' && styles.messageWrapperUser,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.senderType === 'user'
                      ? styles.messageBubbleUser
                      : msg.senderType === 'system'
                      ? styles.messageBubbleSystem
                      : styles.messageBubbleSupport,
                  ]}
                >
                  {msg.senderType === 'agent' && (
                    <View style={styles.supportBadge}>
                      <Ionicons name="headset" size={12} color={Colors.secondary[600]} />
                      <ThemedText style={styles.supportBadgeText}>Support</ThemedText>
                    </View>
                  )}
                  {msg.senderType === 'system' && (
                    <View style={styles.supportBadge}>
                      <Ionicons name="information-circle" size={12} color={Colors.gray[500]} />
                      <ThemedText style={[styles.supportBadgeText, { color: Colors.gray[500] }]}>System</ThemedText>
                    </View>
                  )}
                  <ThemedText
                    style={[
                      styles.messageText,
                      msg.senderType === 'user' && styles.messageTextUser,
                      msg.senderType === 'system' && styles.messageTextSystem,
                    ]}
                  >
                    {msg.message}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.messageTime,
                      msg.senderType === 'user' && styles.messageTimeUser,
                    ]}
                  >
                    {formatTime(msg.timestamp)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Area - shown only for active tickets */}
          {isActive && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type your message..."
                placeholderTextColor={Colors.gray[400]}
                multiline
                maxLength={5000}
              />
              <Pressable
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.background.primary} />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={newMessage.trim() ? colors.background.primary : Colors.gray[400]}
                  />
                )}
              </Pressable>
            </View>
          )}

          {/* Resolution Actions */}
          {ticket.status === 'resolved' && !showRating && (
            <View style={styles.resolutionActions}>
              <ThemedText style={styles.resolutionText}>Was your issue resolved?</ThemedText>
              <View style={styles.resolutionButtons}>
                <Pressable
                  style={styles.resolutionButtonYes}
                  onPress={() => {
                    if (canRate) {
                      setShowRating(true);
                    } else {
                      handleCloseTicket();
                    }
                  }}
                >
                  <Ionicons name="thumbs-up" size={20} color={colors.background.primary} />
                  <ThemedText style={styles.resolutionButtonText}>
                    {canRate ? 'Yes, Rate' : 'Yes, Close'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.resolutionButtonNo}
                  onPress={handleReopenTicket}
                  disabled={reopening}
                >
                  {reopening ? (
                    <ActivityIndicator size="small" color={Colors.text?.primary || colors.deepNavy} />
                  ) : (
                    <>
                      <Ionicons name="thumbs-down" size={20} color={Colors.text?.primary || colors.deepNavy} />
                      <ThemedText style={styles.resolutionButtonNoText}>No, reopen</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Rating Form */}
          {showRating && canRate && (
            <View style={styles.ratingContainer}>
              <ThemedText style={styles.ratingTitle}>Rate your experience</ThemedText>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => setRatingScore(star)}>
                    <Ionicons
                      name={star <= ratingScore ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= ratingScore ? Colors.gold || '#FFB800' : Colors.gray[300]}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.ratingInput}
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="Any feedback? (optional)"
                placeholderTextColor={Colors.gray[400]}
                maxLength={1000}
              />
              <Pressable
                style={[styles.ratingSubmit, ratingScore === 0 && styles.submitButtonDisabled]}
                onPress={handleSubmitRating}
                disabled={ratingScore === 0 || submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <ThemedText style={styles.ratingSubmitText}>Submit Rating</ThemedText>
                )}
              </Pressable>
            </View>
          )}

          {/* Already Rated */}
          {ticket.rating && (
            <View style={styles.ratedContainer}>
              <ThemedText style={styles.ratedText}>You rated this ticket</ThemedText>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={star <= ticket.rating!.score ? 'star' : 'star-outline'}
                    size={20}
                    color={star <= ticket.rating!.score ? Colors.gold || '#FFB800' : Colors.gray[300]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Closed Ticket Actions */}
          {ticket.status === 'closed' && !ticket.rating && (
            <View style={styles.closedActions}>
              <Pressable style={styles.reopenButton} onPress={handleReopenTicket} disabled={reopening}>
                {reopening ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color={colors.background.primary} />
                    <ThemedText style={styles.reopenButtonText}>Reopen Ticket</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Active Ticket Close Button */}
          {isActive && (
            <View style={styles.closedActions}>
              <Pressable style={styles.closeButton} onPress={handleCloseTicket} disabled={closing}>
                {closing ? (
                  <ActivityIndicator color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                    <ThemedText style={styles.closeButtonText}>Close Ticket</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background?.secondary || Colors.gray[50],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
    marginBottom: 4,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    width: 40,
  },
  ticketInfo: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  ticketSubject: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text?.primary || colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: Spacing.md,
  },
  messageBubbleSupport: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 0,
    ...Shadows.subtle,
  },
  messageBubbleUser: {
    backgroundColor: Colors.secondary[600],
    borderTopRightRadius: 0,
  },
  messageBubbleSystem: {
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    alignSelf: 'center',
  },
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  supportBadgeText: {
    fontSize: 11,
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    color: Colors.text?.primary || colors.deepNavy,
    lineHeight: 20,
  },
  messageTextUser: {
    color: colors.background.primary,
  },
  messageTextSystem: {
    color: Colors.gray[600],
    fontStyle: 'italic',
    fontSize: 13,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.gray[400],
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text?.primary || colors.deepNavy,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[200],
  },
  resolutionActions: {
    backgroundColor: Colors.success + '15',
    padding: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.success + '30',
  },
  resolutionText: {
    fontSize: 15,
    color: Colors.text?.primary || colors.deepNavy,
    marginBottom: Spacing.md,
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  resolutionButtonYes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  resolutionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  resolutionButtonNo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  resolutionButtonNoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text?.primary || colors.deepNavy,
  },
  ratingContainer: {
    backgroundColor: colors.background.primary,
    padding: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ratingInput: {
    width: '100%',
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text?.primary || colors.deepNavy,
    marginBottom: 12,
  },
  ratingSubmit: {
    backgroundColor: Colors.secondary[600],
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  ratingSubmitText: {
    color: colors.background.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  ratedContainer: {
    backgroundColor: Colors.gold ? `${Colors.gold}15` : '#FFF8E1',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  ratedText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  closedActions: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    backgroundColor: colors.background.primary,
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[600],
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  reopenButtonText: {
    color: colors.background.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  closeButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonContainer: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[600],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 8,
  },
});

export default withErrorBoundary(TicketDetailPage, 'SupportTicketId');
