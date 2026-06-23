// Group Members List Component
// Displays list of members in a group

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { GroupMember } from '@/types/groupBuying.types';
import { colors } from '@/constants/theme';

interface GroupMembersListProps {
  members: GroupMember[];
  creatorId: string;
  currentUserId?: string;
}

function GroupMembersList({
  members,
  creatorId,
  currentUserId,
}: GroupMembersListProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>
        Members ({members.length})
      </Text>

      {members.map((member, index) => (
        <View key={member.id} style={styles.memberCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {member.userAvatar ? (
              <CachedImage
                source={member.userAvatar}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={colors.brand.purpleLight} />
              </View>
            )}
          </View>

          {/* Member Info */}
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{member.userName}</Text>
              {member.userId === creatorId && (
                <View style={styles.creatorBadge}>
                  <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                  <Text style={styles.creatorText}>Creator</Text>
                </View>
              )}
              {member.userId === currentUserId && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>You</Text>
                </View>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.quantity}>Qty: {member.quantity}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.joinedTime}>
                Joined {formatJoinedTime(member.joinedAt)}
              </Text>
            </View>
          </View>

          {/* Payment Status */}
          <View style={styles.statusContainer}>
            {member.isPaid ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.successScale[400]} />
            ) : (
              <Ionicons name="time-outline" size={24} color={colors.warningScale[400]} />
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function formatJoinedTime(date: Date): string {
  const now = new Date();
  const joined = new Date(date);
  const diffMs = now.getTime() - joined.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  creatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  youBadge: {
    backgroundColor: colors.tint.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.infoScale[400],
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantity: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  separator: {
    fontSize: 13,
    color: colors.neutral[300],
  },
  joinedTime: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  statusContainer: {
    marginLeft: 8,
  },
});

export default React.memo(GroupMembersList);
