import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Experiences Index
 * Routes to the correct experiences page based on category slug.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';

function ExperiencesIndex() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  if (slug === 'beauty-wellness') {
    const BeautyExperiences = require('@/components/action-pages/experiences/BeautyExperiencesIndex').default;
    return <BeautyExperiences />;
  }

  if (slug === 'food-dining') {
    const FoodExperiences = require('@/components/action-pages/experiences/FoodExperiencesIndex').default;
    return <FoodExperiences />;
  }

  const GenericExperiences = require('@/components/action-pages/experiences/GenericExperiencesIndex').default;
  return <GenericExperiences />;
}

export default withErrorBoundary(ExperiencesIndex, 'MainCategorySlugExperiencesIndex');
