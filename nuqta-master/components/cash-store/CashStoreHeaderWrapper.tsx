import React from 'react';
import CashbackSummaryHeaderCard from './sections/CashbackSummaryHeaderCard';
import { useCashStoreSection } from '@/hooks/useCashStoreSection';

/**
 * Self-contained wrapper that fetches cashback data and renders the header card.
 * Lazy-loaded in homepage to avoid importing cashstore APIs until Cash tab is active.
 */
const CashStoreHeaderWrapper: React.FC = () => {
  const { cashbackSummary, isLoading } = useCashStoreSection({ autoFetch: true });

  return (
    <CashbackSummaryHeaderCard
      total={cashbackSummary.total}
      pending={cashbackSummary.pending}
      confirmed={cashbackSummary.confirmed}
      available={cashbackSummary.available}
      isLoading={isLoading}
    />
  );
};

export default React.memo(CashStoreHeaderWrapper);
