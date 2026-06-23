import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Dynamic Category Page
 * /MainCategory/[slug]
 * Delegates to DynamicCategoryPage component
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import DynamicCategoryPage from '@/components/category-pages/DynamicCategoryPage';

function CategoryPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  if (!slug) return null;

  return <DynamicCategoryPage slug={slug} />;
}

export default withErrorBoundary(CategoryPage, 'MainCategorySlugIndex');
