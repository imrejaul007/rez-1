import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/theme';

interface Specification {
  label: string;
  value: string;
}

interface SpecificationsTableProps {
  specifications: Record<string, string>;
  defaultExpanded?: boolean;
}

function SpecificationsTable({
  specifications,
  defaultExpanded = false
}: SpecificationsTableProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const specs: Specification[] = Object.entries(specifications).map(([label, value]) => ({
    label,
    value,
  }));

  const visibleSpecs = expanded ? specs : specs.slice(0, 5);
  const hasMore = specs.length > 5;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Product Specifications</Text>

      <View style={styles.table}>
        {visibleSpecs.map((spec, index) => (
          <View
            key={spec.label}
            style={[
              styles.row,
              index % 2 === 0 && styles.rowEven,
              index === visibleSpecs.length - 1 && styles.rowLast,
            ]}
          >
            <Text style={styles.label}>{spec.label}</Text>
            <Text style={styles.value}>{spec.value}</Text>
          </View>
        ))}
      </View>

      {hasMore && (
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {expanded ? 'Show Less' : `Show All (${specs.length})`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rowEven: {
    backgroundColor: '#f8f8f8',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    color: colors.midGray,
    flex: 1,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  toggleButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C47FF',
  },
});

export default React.memo(SpecificationsTable);
