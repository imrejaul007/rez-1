import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import WhatsNewStoriesFlow from '@/components/whats-new/WhatsNewStoriesFlow';
import { colors } from '@/constants/theme';

const WhatsNewPage: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const startIndex = parseInt(params.startIndex as string || '0', 10);

  const handleClose = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
          presentation: 'fullScreenModal',
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <WhatsNewStoriesFlow onClose={handleClose} startIndex={startIndex} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default withErrorBoundary(WhatsNewPage, 'WhatsNew');
