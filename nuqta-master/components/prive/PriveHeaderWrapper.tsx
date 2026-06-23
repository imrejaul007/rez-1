import React from 'react';
import { PriveMemberCard } from './PriveMemberCard';
import { usePriveSection } from '@/hooks/usePriveSection';

/**
 * Self-contained wrapper that fetches prive data and renders the member card.
 * Lazy-loaded in homepage to avoid importing prive APIs until Prive tab is active.
 */
const PriveHeaderWrapper: React.FC = () => {
  const { userData } = usePriveSection();

  if (!userData) return null;

  return (
    <PriveMemberCard
      memberName={userData.name}
      tier={userData.tier}
      tierProgress={userData.tierProgress}
      nextTier={userData.nextTier}
      pointsToNext={userData.pointsToNext}
      memberId={userData.memberId}
      validThru={userData.validThru}
      totalScore={userData.totalScore}
    />
  );
};

export default React.memo(PriveHeaderWrapper);
