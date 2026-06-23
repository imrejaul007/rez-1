import { withErrorBoundary } from '@/utils/withErrorBoundary';
// UGC (User Generated Content) Detail Page
// This route uses UGCDetailScreen component for viewing videos

import React from 'react';
import { Stack } from 'expo-router';
import UGCDetailScreen from '@/app/UGCDetailScreen';

function UGCDetailPage() {
  return (
    <>
      {/* Hide the default header for immersive video experience */}
      <Stack.Screen options={{ headerShown: false }} />
      <UGCDetailScreen />
    </>
  );
}

export default withErrorBoundary(UGCDetailPage, 'UgcId');
