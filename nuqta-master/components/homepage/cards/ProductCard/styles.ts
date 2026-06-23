/**
 * ProductCard Styles
 *
 * Centralized styles for ProductCard component
 */

import { StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    height: 320,
  },
});

export default styles;
