// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Group Buy Page
// Complete Group Buying Feature Implementation

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useGroupBuying } from '@/hooks/useGroupBuying';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import GroupCard from '@/components/group-buying/GroupCard';
import GroupCreationModal from '@/components/group-buying/GroupCreationModal';
import GroupShareModal from '@/components/group-buying/GroupShareModal';
import GroupMembersList from '@/components/group-buying/GroupMembersList';
import GroupDiscountCalculator from '@/components/group-buying/GroupDiscountCalculator';
import {
  GroupBuyingGroup,
  GroupBuyingProduct,
  CreateGroupRequest,
  JoinGroupRequest,
} from '@/types/groupBuying.types';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

type TabType = 'available' | 'my-groups' | 'products';

const GroupBuyPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const groupBuying = useGroupBuying();

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GroupBuyingProduct | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupBuyingGroup | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // AuthContext navigation guard handles unauthenticated redirect

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'available') {
        await groupBuying.refreshAvailableGroups();
      } else if (activeTab === 'my-groups') {
        await groupBuying.refreshMyGroups();
      }
    } finally {
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async (data: CreateGroupRequest) => {
    const group = await groupBuying.createGroup(data);
    if (group) {
      platformAlertConfirm(
        'Group Created!',
        'Your group has been created. Share it with friends to unlock bigger discounts!',
        () => {
          if (!isMounted()) return;
          setSelectedGroup(group);
          if (!isMounted()) return;
          setShowShareModal(true);
        },
        'Share Now'
      );
      if (!isMounted()) return;
      setActiveTab('my-groups');
    } else if (groupBuying.error) {
      platformAlertSimple('Error', groupBuying.error);
    }
  };

  // Handle join group by code
  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      platformAlertSimple('Error', 'Please enter a group code');
      return;
    }

    const group = await groupBuying.getGroupByCode(joinCode.trim().toUpperCase());
    if (group) {
      platformAlertConfirm(
        'Join Group?',
        `Join ${group.product.name} group? Current discount: ${group.currentTier.discountPercentage}% OFF`,
        async () => {
          const joinData: JoinGroupRequest = {
            groupCode: joinCode.trim().toUpperCase(),
            quantity: 1,
          };
          const joinedGroup = await groupBuying.joinGroup(joinData);
          if (joinedGroup) {
            if (!isMounted()) return;
            setJoinCode('');
            if (!isMounted()) return;
            setShowJoinInput(false);
            if (!isMounted()) return;
            setActiveTab('my-groups');
            platformAlertSimple('Success!', 'You have joined the group');
          } else if (groupBuying.error) {
            platformAlertSimple('Error', groupBuying.error);
          }
        },
        'Join'
      );
    } else {
      platformAlertSimple('Error', groupBuying.error || 'Group not found');
    }
  };

  // Handle group card press
  const handleGroupPress = (group: GroupBuyingGroup) => {
    if (expandedGroupId === group.id) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(group.id);
      groupBuying.getGroupDetails(group.id);
    }
  };

  // Handle product select for group creation
  const handleProductSelect = (product: GroupBuyingProduct) => {
    setSelectedProduct(product);
    setShowCreateModal(true);
  };

  // Handle leave group
  const handleLeaveGroup = (groupId: string) => {
    platformAlertDestructive(
      'Leave Group?',
      'Are you sure you want to leave this group?',
      'Leave',
      async () => {
        const success = await groupBuying.leaveGroup(groupId);
        if (success) {
          platformAlertSimple('Success', 'You have left the group');
          if (!isMounted()) return;
          setExpandedGroupId(null);
        } else if (groupBuying.error) {
          platformAlertSimple('Error', groupBuying.error);
        }
      }
    );
  };

  // Render available groups tab
  const renderAvailableGroups = () => {
    if (groupBuying.loading && !refreshing) {
      return <CardGridSkeleton />;
    }

    if (groupBuying.availableGroups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={Colors.border.default} />
          <Text style={styles.emptyTitle}>No Active Groups</Text>
          <Text style={styles.emptyText}>
            Be the first to create a group and start saving!
          </Text>
          <Pressable
            style={styles.createButton}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.createButtonText}>Browse Products</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {groupBuying.availableGroups.map((group) => (
          <View key={group.id}>
            <GroupCard
              group={group}
              onPress={() => handleGroupPress(group)}
              showJoinButton={!groupBuying.myGroups.find((g) => g.id === group.id)}
            />

            {/* Expanded Group Details */}
            {expandedGroupId === group.id && (
              <View style={styles.expandedSection}>
                <GroupDiscountCalculator group={group} />
                <GroupMembersList
                  members={group.members}
                  creatorId={group.creatorId}
                  currentUserId={user?.id}
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  // Render my groups tab
  const renderMyGroups = () => {
    if (groupBuying.loading && !refreshing) {
      return <CardGridSkeleton />;
    }

    if (groupBuying.myGroups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-circle-outline" size={64} color={Colors.border.default} />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptyText}>
            Join or create a group to start saving with friends!
          </Text>
          <View style={styles.emptyActions}>
            <Pressable
              style={styles.createButton}
              onPress={() => setActiveTab('products')}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Group</Text>
            </Pressable>
            <Pressable
              style={styles.joinButton}
              onPress={() => setShowJoinInput(true)}
            >
              <Ionicons name="enter-outline" size={20} color={Colors.brand.purpleLight} />
              <Text style={styles.joinButtonText}>Join Group</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {groupBuying.myGroups.map((group) => (
          <View key={group.id}>
            <GroupCard group={group} onPress={() => handleGroupPress(group)} />

            {/* Expanded Group Details */}
            {expandedGroupId === group.id && (
              <View style={styles.expandedSection}>
                <GroupDiscountCalculator group={group} />
                <GroupMembersList
                  members={group.members}
                  creatorId={group.creatorId}
                  currentUserId={user?.id}
                />

                {/* Group Actions */}
                <View style={styles.groupActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedGroup(group);
                      setShowShareModal(true);
                    }}
                  >
                    <Ionicons name="share-social" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Share Group</Text>
                  </Pressable>

                  {group.creatorId !== user?.id && (
                    <Pressable
                      style={[styles.actionButton, styles.leaveButton]}
                      onPress={() => handleLeaveGroup(group.id)}
                    >
                      <Ionicons name="exit-outline" size={20} color={Colors.error} />
                      <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  // Render products tab
  const renderProducts = () => {
    if (groupBuying.loading && !refreshing) {
      return <CardGridSkeleton />;
    }

    if (groupBuying.availableProducts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={Colors.border.default} />
          <Text style={styles.emptyTitle}>No Products Available</Text>
          <Text style={styles.emptyText}>
            Check back later for new group buying deals!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {groupBuying.availableProducts.map((product) => (
          <Pressable
            key={product.id}
            style={styles.productCard}
            onPress={() => handleProductSelect(product)}
           
          >
            <View style={styles.productContent}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productStore}>{product.storeName}</Text>
              <View style={styles.productPriceRow}>
                <Text style={styles.productPrice}>{currencySymbol}{product.basePrice}</Text>
                <View style={styles.productDiscount}>
                  <Text style={styles.productDiscountText}>
                    Up to {product.discountTiers[product.discountTiers.length - 1]?.discountPercentage}% OFF
                  </Text>
                </View>
              </View>
              <View style={styles.productMeta}>
                <View style={styles.productMetaItem}>
                  <Ionicons name="people" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.productMetaText}>
                    {product.minMembers}-{product.maxMembers} members
                  </Text>
                </View>
                <View style={styles.productMetaItem}>
                  <Ionicons name="time" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.productMetaText}>
                    {product.expiryDuration}h duration
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.createGroupButton}>
              <Ionicons name="add-circle" size={24} color={Colors.brand.purpleLight} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Group Buy</Text>
            <Text style={styles.headerSubtitle}>Save more together</Text>
          </View>
          <Pressable
            style={styles.codeButton}
            onPress={() => setShowJoinInput(!showJoinInput)}
          >
            <Ionicons name="enter-outline" size={24} color="white" />
          </Pressable>
        </View>

        {/* Join by Code Input */}
        {showJoinInput && (
          <View style={styles.joinCodeContainer}>
            <TextInput
              style={styles.joinCodeInput}
              placeholder="Enter group code"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Pressable style={styles.joinCodeButton} onPress={handleJoinByCode}>
              <Text style={styles.joinCodeButtonText}>Join</Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'available' ? Colors.brand.purpleLight : Colors.text.tertiary}
          />
          <Text
            style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}
          >
            Available ({groupBuying.availableGroups.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'my-groups' && styles.tabActive]}
          onPress={() => setActiveTab('my-groups')}
        >
          <Ionicons
            name="person-circle"
            size={20}
            color={activeTab === 'my-groups' ? Colors.brand.purpleLight : Colors.text.tertiary}
          />
          <Text
            style={[styles.tabText, activeTab === 'my-groups' && styles.tabTextActive]}
          >
            My Groups ({groupBuying.myGroups.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="cube"
            size={20}
            color={activeTab === 'products' ? Colors.brand.purpleLight : Colors.text.tertiary}
          />
          <Text
            style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}
          >
            Products
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'available' && renderAvailableGroups()}
        {activeTab === 'my-groups' && renderMyGroups()}
        {activeTab === 'products' && renderProducts()}
      </View>

      {/* Modals */}
      <GroupCreationModal
        visible={showCreateModal}
        product={selectedProduct}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleCreateGroup}
      />

      <GroupShareModal
        visible={showShareModal}
        group={selectedGroup}
        onClose={() => {
          setShowShareModal(false);
          setSelectedGroup(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  codeButton: {
    padding: Spacing.sm,
  },
  joinCodeContainer: {
    flexDirection: 'row',
    marginTop: Spacing.base,
    gap: Spacing.md,
  },
  joinCodeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    letterSpacing: 2,
  },
  joinCodeButton: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  joinCodeButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.brand.purpleLight,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.brand.purpleLight,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  createButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.brand.purpleLight,
  },
  joinButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  expandedSection: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: -8,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.base,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  leaveButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  leaveButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productContent: {
    flex: 1,
  },
  productName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  productStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  productPrice: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.brand.purpleLight,
  },
  productDiscount: {
    backgroundColor: colors.tint.green,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  productDiscountText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  productMeta: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  productMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  productMetaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  createGroupButton: {
    marginLeft: Spacing.md,
  },
});

export default withErrorBoundary(GroupBuyPage, 'GroupBuy');
