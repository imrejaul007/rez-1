import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const BillUploadCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.tint.amberLight, colors.warningScale[200]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={20} color={colors.warningScale[700]} />
          </View>
          <Text style={styles.title}>Special Case: Bill Upload</Text>
        </View>

        <Text style={styles.subtitle}>If store payment is manual:</Text>

        <View style={styles.itemsContainer}>
          <View style={styles.itemRow}>
            <View style={styles.bullet} />
            <Text style={styles.itemText}>Upload bill photo</Text>
          </View>
          <View style={styles.itemRow}>
            <View style={styles.bullet} />
            <Text style={styles.itemText}>Cashback credited after verification</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.primary,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.amberDark,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#A16207',
    marginBottom: 12,
  },
  itemsContainer: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warningScale[700],
    marginRight: 10,
  },
  itemText: {
    fontSize: 14,
    color: colors.brand.amberDark,
    fontWeight: '500',
  },
});

export default React.memo(BillUploadCard);
