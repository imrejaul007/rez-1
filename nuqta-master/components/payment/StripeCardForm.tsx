import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

// This is the base component that will be used as a fallback
// The platform-specific versions (.web.tsx and .native.tsx) will override this
const StripeCardForm: React.FC<any> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Payment form loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  text: {
    fontSize: 16,
    color: colors.midGray,
    textAlign: 'center',
  },
});

export default StripeCardForm;