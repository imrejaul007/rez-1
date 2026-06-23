import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import LearnMaximiseSection from '../components/earn/LearnMaximiseSection';
import { ProgramDetailModal } from '@/components/earn/ProgramDetailModal';
import { Colors } from '@/constants/DesignSystem';
import { usePlayAndEarnData } from '@/hooks/usePlayAndEarnData';
import { earnStyles as styles } from '@/components/earn/sections/styles';
import {
  WalletSummarySection,
  GamesGridSection,
  ChallengesSection,
  QuickEarnSection,
  SocialMediaBanner,
  CreatorEarningsSection,
  DailyStreakSection,
  ShoppingEarnSection,
  ShareEngageSection,
  SocialImpactSection,
  SpecialProgramsSection,
  ExclusiveZonesSection,
  EventsSection,
  BonusZoneSection,
  BonusOpportunitiesSection,
  TournamentsSection,
  AchievementsSection,
  LeaderboardPreviewSection,
  WhyRezSection,
  BottomCTA,
} from '@/components/earn/sections';

const PlayAndEarn = () => {
  const data = usePlayAndEarnData();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={data.refreshing}
              onRefresh={data.handleRefresh}
              colors={[Colors.gold]}
              tintColor={Colors.gold}
            />
          }
        >
          {/* Header: Earnings Snapshot */}
          <WalletSummarySection
            rezCoins={data.rezCoins}
            totalBrandedCoins={data.totalBrandedCoins}
            totalPromoCoins={data.totalPromoCoins}
            currencySymbol={data.currencySymbol}
            monthlyEarnings={data.monthlyEarnings}
            navigateTo={data.navigateTo}
          />

          {/* Quick Earn Actions */}
          <QuickEarnSection
            quickActions={data.resolvedQuickActions}
            navigateTo={data.navigateTo}
          />

          {/* Earn from Social Media */}
          <SocialMediaBanner navigateTo={data.navigateTo} />

          {/* Creator Earnings Section */}
          <CreatorEarningsSection
            featuredCreators={data.featuredCreators}
            trendingPicks={data.trendingPicks}
            likedPicks={data.likedPicks}
            creatorStatus={data.creatorStatus}
            handlePickLike={data.handlePickLike}
            navigateTo={data.navigateTo}
            currencySymbol={data.currencySymbol}
          />

          {/* Daily & Streak Earnings */}
          <DailyStreakSection
            currentStreak={data.currentStreak}
            hasCheckedInToday={data.hasCheckedInToday}
            streakBonusMilestones={data.streakBonusMilestones}
            navigateTo={data.navigateTo}
          />

          {/* Shopping & Payment Earnings */}
          <ShoppingEarnSection
            shoppingMethods={data.shoppingMethods}
            navigateTo={data.navigateTo}
          />

          {/* Social & Community Earnings */}
          <ShareEngageSection
            socialActions={data.socialActions}
            navigateTo={data.navigateTo}
          />

          {/* Social Impact Section */}
          <SocialImpactSection
            socialImpactPreview={data.socialImpactPreview}
            navigateTo={data.navigateTo}
          />

          {/* Special Programs */}
          <SpecialProgramsSection
            apiSpecialPrograms={data.apiSpecialPrograms}
            specialProgramsLoaded={data.specialProgramsLoaded}
            selectedProgramSlug={data.selectedProgramSlug}
            setSelectedProgramSlug={data.setSelectedProgramSlug}
            navigateTo={data.navigateTo}
          />

          {/* Exclusive Zones */}
          <ExclusiveZonesSection
            zones={data.exclusiveZones}
            navigateTo={data.navigateTo}
          />

          {/* Program Detail Modal */}
          <ProgramDetailModal
            visible={!!data.selectedProgramSlug}
            onClose={() => data.setSelectedProgramSlug(null)}
            programSlug={data.selectedProgramSlug}
            onStatusChange={data.refreshSpecialPrograms}
          />

          {/* Events & Offline Earnings */}
          <EventsSection
            eventCategories={data.eventCategories}
            eventRewardConfig={data.eventRewardConfig}
            navigateTo={data.navigateTo}
          />

          {/* Bonus Zone */}
          <BonusZoneSection
            bonusCampaigns={data.bonusCampaigns}
            currencySymbol={data.currencySymbol}
            navigateTo={data.navigateTo}
          />

          {/* Bonus Opportunities (time-limited) */}
          <BonusOpportunitiesSection
            bonusOpportunities={data.bonusOpportunities}
            replaceCurrencySymbol={data.replaceCurrencySymbol}
            navigateTo={data.navigateTo}
          />

          {/* Learn & Maximise Section */}
          <LearnMaximiseSection />

          {/* Daily Games Section */}
          <GamesGridSection
            allGames={data.allGames}
            navigateTo={data.navigateTo}
          />

          {/* Active Challenges Section */}
          <ChallengesSection
            challenges={data.challenges}
            loading={data.loading}
            navigateTo={data.navigateTo}
          />

          {/* Below-fold sections: lazy loaded after interactions complete */}
          {data.belowFoldReady ? (
            <>
              {/* Live Tournaments Section */}
              <TournamentsSection
                tournaments={data.tournaments}
                navigateTo={data.navigateTo}
              />

              {/* Achievements Section */}
              <AchievementsSection
                achievements={data.achievements}
                loading={data.loading}
                navigateTo={data.navigateTo}
              />

              {/* Leaderboard Preview */}
              <LeaderboardPreviewSection
                myRank={data.myRank}
                navigateTo={data.navigateTo}
              />

              {/* Why ReZ Pays More */}
              <WhyRezSection
                valueCards={data.valueCards}
                navigateTo={data.navigateTo}
              />
            </>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.nileBlue} />
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Bottom CTA */}
        <BottomCTA navigateTo={data.navigateTo} />
      </View>
    </>
  );
};

export default withErrorBoundary(PlayAndEarn, 'Playandearn');
