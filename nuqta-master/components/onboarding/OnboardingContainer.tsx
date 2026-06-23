import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import PurpleGradientBg from './PurpleGradientBg';
import { colors } from '@/constants/theme';

interface OnboardingContainerProps {
  children: React.ReactNode;
  useGradient?: boolean;
  style?: any;
  contentStyle?: any;
}

export default function OnboardingContainer({ 
  children, 
  useGradient = true, 
  style,
  contentStyle 
}: OnboardingContainerProps) {
  const Container = useGradient ? PurpleGradientBg : View;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Container style={[styles.container, style]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </SafeAreaView>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});