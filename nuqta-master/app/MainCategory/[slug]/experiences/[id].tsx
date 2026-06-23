import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Experience Detail
 * Routes to the correct experience detail page based on category slug.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';

function ExperienceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  if (slug === 'beauty-wellness') {
    const BeautyDetail = require('@/components/action-pages/experiences/BeautyExperienceDetail').default;
    return <BeautyDetail />;
  }

  if (slug === 'food-dining') {
    const FoodDetail = require('@/components/action-pages/experiences/FoodExperienceDetail').default;
    return <FoodDetail />;
  }

  const GenericDetail = require('@/components/action-pages/experiences/GenericExperienceDetail').default;
  return <GenericDetail />;
}

export default withErrorBoundary(ExperienceDetail, 'MainCategorySlugExperiencesId');
