import React from 'react';
import { View, Text, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { LiveTournament } from '@/services/tournamentApi';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

const NUQTA_COIN = BRAND.COIN_IMAGE;

interface TournamentsSectionProps {
  tournaments: LiveTournament[];
  navigateTo: (path: string) => void;
}

const TournamentsSection = React.memo(function TournamentsSection({
  tournaments,
  navigateTo,
}: TournamentsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWithLink}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.tournamentIconBg}>
            <Ionicons name="trophy" size={18} color={Colors.text.inverse} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Tournaments</Text>
            <Text style={styles.sectionSubtitle}>Compete & win big prizes</Text>
          </View>
        </View>
        {tournaments.length > 0 && (
          <View style={styles.tournamentLiveBadge}>
            <View style={styles.tournamentLiveDot} />
            <Text style={styles.tournamentLiveText}>LIVE</Text>
          </View>
        )}
      </View>

      {tournaments.length > 0 ? tournaments.map((tournament, idx) => {
        const isActive = tournament.status === 'active';
        const statusColors = isActive ? [colors.successScale[700], colors.successScale[400]] : [colors.brand.blue, colors.infoScale[400]];

        return (
          <Pressable
            key={tournament.id}
            onPress={() => navigateTo(tournament.path || `/playandearn/TournamentDetail?id=${tournament.id}`)}
            style={{ marginBottom: idx < tournaments.length - 1 ? 12 : 0 }}
          >
            <LinearGradient
              colors={[colors.nileBlue, '#234B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tournamentCard}
            >
              {/* Status badge */}
              <View style={[styles.tournamentStatusBadge, { backgroundColor: statusColors[0] }]}>
                <Text style={styles.tournamentStatusText}>
                  {isActive ? 'LIVE' : 'UPCOMING'}
                </Text>
              </View>

              {/* Top row */}
              <View style={styles.tournamentTopRow}>
                <Text style={styles.tournamentIcon}>{tournament.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tournamentTitle} numberOfLines={1}>{tournament.title}</Text>
                  <View style={styles.tournamentPlayersRow}>
                    <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.tournamentParticipants}>
                      {tournament.participants.toLocaleString()} players
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.tournamentStatsRow}>
                <View style={styles.tournamentStatBox}>
                  <CachedImage source={NUQTA_COIN} style={{ width: 16, height: 16 }} />
                  <Text style={styles.tournamentStatBoxValue}>{tournament.prize}</Text>
                  <Text style={styles.tournamentStatBoxLabel}>Prize Pool</Text>
                </View>
                <View style={[styles.tournamentStatBox, styles.tournamentStatBoxMiddle]}>
                  <Ionicons name="medal" size={16} color={colors.warningScale[400]} />
                  <Text style={styles.tournamentStatBoxValue}>
                    {tournament.isParticipant && tournament.userRank ? `#${tournament.userRank}` : '--'}
                  </Text>
                  <Text style={styles.tournamentStatBoxLabel}>Your Rank</Text>
                </View>
                <View style={styles.tournamentStatBox}>
                  <Ionicons name="time" size={16} color={isActive ? colors.errorScale[400] : colors.infoScale[400]} />
                  <Text style={[styles.tournamentStatBoxValue, { color: isActive ? colors.errorScale[400] : colors.infoScale[400] }]}>
                    {tournament.endsIn || tournament.startsIn || '--'}
                  </Text>
                  <Text style={styles.tournamentStatBoxLabel}>
                    {isActive ? 'Ends In' : 'Starts In'}
                  </Text>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.tournamentCTA}>
                <Text style={styles.tournamentCTAText}>
                  {tournament.isParticipant ? 'View Tournament' : 'Join Now'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.nileBlue} />
              </View>
            </LinearGradient>
          </Pressable>
        );
      }) : (
        <View style={styles.tournamentEmptyCard}>
          <Ionicons name="trophy-outline" size={40} color="#CBD5E1" />
          <Text style={styles.tournamentEmptyTitle}>No Active Tournaments</Text>
          <Text style={styles.tournamentEmptyText}>New tournaments are announced regularly. Check back soon!</Text>
        </View>
      )}
    </View>
  );
});

export default TournamentsSection;
