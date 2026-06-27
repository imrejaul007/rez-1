// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Tickets Page
// Lists all support tickets with filters, pagination, and status badges

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import supportService, { SupportTicket, GetTicketsFilters } from '@/services/supportApi';
import { Colors, Spacing, Gradients, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_customer', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
] as const;

function TicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTickets = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    const filters: GetTicketsFilters = {
      page: currentPage,
      limit: 20,
    };
    if (activeFilter !== 'all') {
      filters.status = activeFilter as GetTicketsFilters['status'];
    }

    try {
      const response = await supportService.getMyTickets(filters);
      if (response.success && response.data) {
        if (reset || currentPage === 1) {
          setTickets(response.data.tickets);
        } else {
          setTickets(prev => [...prev, ...response.data!.tickets]);
        }
        setTotalPages(response.data.pages);
      }
    } catch (error) {
      // silently handle
    }
  }, [activeFilter, page]);
  const isMounted = useIsMounted();

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadTickets(true).finally(() => setLoading(false));
  }, [activeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadTickets(true);
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    const filters: GetTicketsFilters = {
      page: nextPage,
      limit: 20,
    };
    if (activeFilter !== 'all') {
      filters.status = activeFilter as GetTicketsFilters['status'];
    }

    try {
      const response = await supportService.getMyTickets(filters);
      if (response.success && response.data) {
        setTickets(prev => [...prev, ...response.data!.tickets]);
        setTotalPages(response.data.pages);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return Colors.error;
      case 'high': return '#E65100';
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.gray[400];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderFilterChip = (filter: typeof STATUS_FILTERS[number]) => {
    const isActive = activeFilter === filter.key;
    return (
      <Pressable
        key={filter.key}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => handleFilterChange(filter.key)}
      >
        <ThemedText style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {filter.label}
        </ThemedText>
      </Pressable>
    );
  };
  const renderFilterChipItem = useCallback(({ item }: { item: typeof STATUS_FILTERS[number] }) => renderFilterChip(item), [activeFilter]);

  const renderTicketCard = ({ item: ticket }: { item: SupportTicket }) => {
    const statusColor = getStatusColor(ticket.status);
    const priorityColor = getPriorityColor(ticket.priority);
    const lastMessage = ticket.messages?.[ticket.messages.length - 1];

    return (
      <Pressable
        style={styles.ticketCard}
        onPress={() => router.push(`/support/ticket/${ticket._id}` as any)}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketTitleRow}>
            <ThemedText style={styles.ticketNumber}>{ticket.ticketNumber}</ThemedText>
            <View style={styles.badgeRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {ticket.status.replace(/_/g, ' ')}
                </ThemedText>
              </View>
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

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.ticketCard}>
          <View style={styles.skeletonRow}>
            <SkeletonLoader width={100} height={14} borderRadius={4} />
            <SkeletonLoader width={70} height={22} borderRadius={12} />
          </View>
          <SkeletonLoader width="80%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonLoader width="100%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
          <SkeletonLoader width="60%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
          <View style={[styles.skeletonRow, { marginTop: 12 }]}>
            <SkeletonLoader width={80} height={14} borderRadius={4} />
            <SkeletonLoader width={60} height={22} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ticket-outline" size={64} color={Colors.gray[300]} />
      <ThemedText style={styles.emptyTitle}>No Tickets Found</ThemedText>
      <ThemedText style={styles.emptyText}>
        {activeFilter !== 'all'
          ? `You don't have any ${activeFilter.replace(/_/g, ' ')} tickets.`
          : "You haven't created any support tickets yet."}
      </ThemedText>
      <Pressable
        style={styles.emptyButton}
        onPress={() => router.push('/support/create-ticket' as any)}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.background.primary} />
        <ThemedText style={styles.emptyButtonText}>Create Ticket</ThemedText>
      </Pressable>
    </View>
  );

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
            <ThemedText style={styles.headerTitle}>My Tickets</ThemedText>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/support/create-ticket' as any)}
            >
              <Ionicons name="add" size={24} color={colors.background.primary} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <View style={styles.filtersContainer}>
          <FlashList
            data={STATUS_FILTERS as unknown as typeof STATUS_FILTERS[number][]}
            renderItem={renderFilterChipItem}
            keyExtractor={item => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
            estimatedItemSize={44}
          />
        </View>

        {/* Tickets List */}
        {loading ? (
          renderSkeleton()
        ) : (
          <FlashList
            data={tickets}
            renderItem={renderTicketCard}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ThemedText style={styles.loadingMoreText}>Loading more...</ThemedText>
                </View>
              ) : null
            }
            estimatedItemSize={100}
          />
        )}
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
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary[600],
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  filterChipTextActive: {
    color: colors.background.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  ticketCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Shadows.subtle,
  },
  ticketHeader: {
    marginBottom: 10,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketNumber: {
    fontSize: 12,
    color: Colors.gray[500],
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text?.primary || colors.deepNavy,
  },
  lastMessage: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 10,
    lineHeight: 18,
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
    color: Colors.gray[500],
  },
  categoryBadge: {
    backgroundColor: Colors.gray[100],
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
  skeletonContainer: {
    padding: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[600],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[600],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 13,
    color: Colors.gray[400],
  },
});

export default withErrorBoundary(TicketsPage, 'SupportTickets');
