import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import LoadingScreen from '@/components/onboarding/LoadingScreen';
import { navigationDebugger } from '@/utils/navigationDebug';
import analyticsService from '@/services/analyticsService';

function OnboardingLoadingScreen() {
  const router = useRouter();
  useBackButton(() => true); // Block back navigation

  useEffect(() => {
    analyticsService.track('onboarding_completed');
  }, []);

  const handleLoadingComplete = () => {
    navigationDebugger.logNavigation('loading', 'category-selection', 'loading-completed');
    router.replace('/onboarding/category-selection' as any);
  };

  return (
    <LoadingScreen 
      duration={5000} 
      onComplete={handleLoadingComplete} 
    />
  );
}
export default withErrorBoundary(OnboardingLoadingScreen, 'OnboardingLoading');
