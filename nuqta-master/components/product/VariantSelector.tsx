import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/theme';

interface Variant {
  id: string;
  label: string;
  available: boolean;
}

interface VariantSelectorProps {
  title: string;
  variants: Variant[];
  selectedId?: string;
  onSelect: (variantId: string) => void;
}

function VariantSelector({
  title,
  variants,
  selectedId,
  onSelect
}: VariantSelectorProps) {
  const [selected, setSelected] = useState(selectedId || variants.find(v => v.available)?.id || variants[0]?.id);

  const handleSelect = (variantId: string) => {
    setSelected(variantId);
    onSelect(variantId);
  };

  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.variantsContainer}
      >
        {variants.map((variant) => {
          const isSelected = selected === variant.id;
          const isAvailable = variant.available;

          return (
            <Pressable
              key={variant.id}
              style={[
                styles.variantButton,
                isSelected && styles.variantSelected,
                !isAvailable && styles.variantUnavailable,
              ]}
              onPress={() => isAvailable && handleSelect(variant.id)}
              disabled={!isAvailable}
              accessibilityLabel={`${variant.label} ${isSelected ? 'selected' : ''} ${!isAvailable ? 'out of stock' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
            >
              <Text
                style={[
                  styles.variantText,
                  isSelected && styles.variantTextSelected,
                  !isAvailable && styles.variantTextUnavailable,
                ]}
              >
                {variant.label}
              </Text>
              {!isAvailable && (
                <View style={styles.unavailableLine} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  variantsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  variantButton: {
    height: 44,
    minWidth: 64,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    position: 'relative',
  },
  variantSelected: {
    borderColor: '#6C47FF',
    backgroundColor: '#f5f3ff',
  },
  variantUnavailable: {
    borderColor: '#e5e5e5',
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  variantText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  variantTextSelected: {
    color: '#6C47FF',
    fontWeight: '600',
  },
  variantTextUnavailable: {
    color: '#999999',
  },
  unavailableLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#999999',
    transform: [{ rotate: '-15deg' }],
  },
});

export default React.memo(VariantSelector);
