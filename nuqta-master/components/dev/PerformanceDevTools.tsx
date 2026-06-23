/**
 * Performance Dev Tools Component
 * Real-time performance monitoring dashboard for developers
 *
 * Features:
 * - Web Vitals visualization
 * - Custom metrics display
 * - Error log viewer
 * - Memory usage graph
 * - Network request monitor
 * - Floating toggle button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import usePerformanceDashboard from '@/hooks/usePerformanceDashboard';
import { colors } from '@/constants/theme';

// ============================================================================
// Types
// ============================================================================

interface MetricDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Metric display component
 */
function MetricDisplay({ label, value, unit = '', status = 'good' }: MetricDisplayProps) {
  const statusColor = {
    good: colors.successScale[400],
    warning: colors.warningScale[400],
    critical: '#ef4444',
  }[status];

  return (
    <View style={styles.metricContainer}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValue}>
        <Text style={[styles.metricText, { color: statusColor }]}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && <Text style={styles.metricUnit}> {unit}</Text>}
        </Text>
      </View>
    </View>
  );
}

/**
 * Section component
 */
function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

/**
 * Performance score badge
 */
function PerformanceScoreBadge({ score }: { score: number }) {
  const getScoreColor = (s: number): string => {
    if (s >= 90) return colors.successScale[400];
    if (s >= 70) return colors.warningScale[400];
    return '#ef4444';
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
      <Text style={styles.scoreText}>{score.toFixed(0)}</Text>
      <Text style={styles.scoreLabelText}>{getScoreLabel(score)}</Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function PerformanceDevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const dashboard = usePerformanceDashboard({
    updateInterval: 5000,
    autoRefresh: true,
  });

  // Only show in dev mode
  if (!__DEV__) return null;

  // Don't render until we have data
  if (!dashboard) {
    return (
      <Pressable
        style={styles.fabButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.fabIcon}>📊</Text>
      </Pressable>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={styles.fabButton}
        onPress={() => setIsOpen(!isOpen)}
       
      >
        <Text style={styles.fabIcon}>📊</Text>
      </Pressable>

      {/* Dashboard Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Performance Dashboard</Text>
              <PerformanceScoreBadge score={dashboard.score} />
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Web Vitals */}
            {Platform.OS === 'web' && (
              <Section title="Web Vitals">
                <MetricDisplay
                  label="LCP (Largest Contentful Paint)"
                  value={dashboard.webVitals.lcp}
                  unit="ms"
                  status={dashboard.webVitals.lcp < 2500 ? 'good' : dashboard.webVitals.lcp < 4000 ? 'warning' : 'critical'}
                />
                <MetricDisplay
                  label="FID (First Input Delay)"
                  value={dashboard.webVitals.fid}
                  unit="ms"
                  status={dashboard.webVitals.fid < 100 ? 'good' : dashboard.webVitals.fid < 300 ? 'warning' : 'critical'}
                />
                <MetricDisplay
                  label="CLS (Cumulative Layout Shift)"
                  value={dashboard.webVitals.cls}
                  status={dashboard.webVitals.cls < 0.1 ? 'good' : dashboard.webVitals.cls < 0.25 ? 'warning' : 'critical'}
                />
                <MetricDisplay
                  label="FCP (First Contentful Paint)"
                  value={dashboard.webVitals.fcp}
                  unit="ms"
                  status={dashboard.webVitals.fcp < 1800 ? 'good' : dashboard.webVitals.fcp < 3000 ? 'warning' : 'critical'}
                />
                <MetricDisplay
                  label="TTFB (Time to First Byte)"
                  value={dashboard.webVitals.ttfb}
                  unit="ms"
                  status={dashboard.webVitals.ttfb < 800 ? 'good' : dashboard.webVitals.ttfb < 1800 ? 'warning' : 'critical'}
                />
              </Section>
            )}

            {/* Performance Metrics */}
            <Section title="Performance Metrics">
              <MetricDisplay
                label="API Latency (avg)"
                value={dashboard.customMetrics.avgAPILatency}
                unit="ms"
                status={dashboard.customMetrics.avgAPILatency < 1000 ? 'good' : dashboard.customMetrics.avgAPILatency < 2000 ? 'warning' : 'critical'}
              />
              <MetricDisplay
                label="Render Time (avg)"
                value={dashboard.customMetrics.avgRenderTime}
                unit="ms"
                status={dashboard.customMetrics.avgRenderTime < 16 ? 'good' : dashboard.customMetrics.avgRenderTime < 33 ? 'warning' : 'critical'}
              />
              <MetricDisplay
                label="Page Load Time (avg)"
                value={dashboard.customMetrics.avgLoadTime}
                unit="ms"
                status={dashboard.customMetrics.avgLoadTime < 3000 ? 'good' : dashboard.customMetrics.avgLoadTime < 5000 ? 'warning' : 'critical'}
              />
              <MetricDisplay
                label="Cache Hit Rate"
                value={dashboard.customMetrics.cacheHitRate}
                unit="%"
                status={dashboard.customMetrics.cacheHitRate > 70 ? 'good' : dashboard.customMetrics.cacheHitRate > 50 ? 'warning' : 'critical'}
              />
            </Section>

            {/* Slow Operations */}
            {(dashboard.customMetrics.slowAPIs.length > 0 || dashboard.customMetrics.slowComponents.length > 0) && (
              <Section title="Slow Operations">
                {dashboard.customMetrics.slowAPIs.length > 0 && (
                  <>
                    <Text style={styles.subsectionTitle}>Slow APIs:</Text>
                    {dashboard.customMetrics.slowAPIs.slice(0, 3).map((api, index) => (
                      <View key={index} style={styles.slowOpItem}>
                        <Text style={styles.slowOpLabel}>{api.endpoint}</Text>
                        <Text style={styles.slowOpValue}>{api.avgTime.toFixed(0)}ms ({api.count}x)</Text>
                      </View>
                    ))}
                  </>
                )}

                {dashboard.customMetrics.slowComponents.length > 0 && (
                  <>
                    <Text style={styles.subsectionTitle}>Slow Components:</Text>
                    {dashboard.customMetrics.slowComponents.slice(0, 3).map((comp, index) => (
                      <View key={index} style={styles.slowOpItem}>
                        <Text style={styles.slowOpLabel}>{comp.name}</Text>
                        <Text style={styles.slowOpValue}>{comp.avgTime.toFixed(2)}ms ({comp.renderCount}x)</Text>
                      </View>
                    ))}
                  </>
                )}
              </Section>
            )}

            {/* Errors */}
            <Section title="Errors">
              <MetricDisplay
                label="Total Errors"
                value={dashboard.errors.total}
                status={dashboard.errors.total === 0 ? 'good' : dashboard.errors.total < 10 ? 'warning' : 'critical'}
              />
              <MetricDisplay
                label="Error Rate"
                value={dashboard.errors.rate}
                unit="errors/min"
                status={dashboard.errors.rate < 1 ? 'good' : dashboard.errors.rate < 5 ? 'warning' : 'critical'}
              />

              {Object.entries(dashboard.errors.byType).some(([, count]) => count > 0) && (
                <>
                  <Text style={styles.subsectionTitle}>By Type:</Text>
                  {Object.entries(dashboard.errors.byType)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <View key={type} style={styles.errorTypeItem}>
                        <Text style={styles.errorTypeLabel}>{type}</Text>
                        <Text style={styles.errorTypeValue}>{count}</Text>
                      </View>
                    ))}
                </>
              )}

              {Object.entries(dashboard.errors.bySeverity).some(([, count]) => count > 0) && (
                <>
                  <Text style={styles.subsectionTitle}>By Severity:</Text>
                  {Object.entries(dashboard.errors.bySeverity)
                    .filter(([, count]) => count > 0)
                    .map(([severity, count]) => (
                      <View key={severity} style={styles.errorTypeItem}>
                        <Text style={styles.errorTypeLabel}>{severity}</Text>
                        <Text style={styles.errorTypeValue}>{count}</Text>
                      </View>
                    ))}
                </>
              )}
            </Section>

            {/* Memory */}
            {dashboard.memory && (
              <Section title="Memory Usage">
                <MetricDisplay
                  label="Used"
                  value={(dashboard.memory.used / 1024 / 1024).toFixed(2)}
                  unit="MB"
                />
                <MetricDisplay
                  label="Limit"
                  value={(dashboard.memory.limit / 1024 / 1024).toFixed(2)}
                  unit="MB"
                />
                <MetricDisplay
                  label="Percentage"
                  value={dashboard.memory.percentage}
                  unit="%"
                  status={dashboard.memory.percentage < 60 ? 'good' : dashboard.memory.percentage < 80 ? 'warning' : 'critical'}
                />
              </Section>
            )}

            {/* Recommendations */}
            {dashboard.recommendations.length > 0 && (
              <Section title="Recommendations">
                {dashboard.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationText}>• {rec}</Text>
                  </View>
                ))}
              </Section>
            )}

            {/* Timestamp */}
            <Text style={styles.timestamp}>
              Last updated: {dashboard.timestamp.toLocaleTimeString()}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  fabIcon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    color: colors.background.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  scoreLabelText: {
    fontSize: 12,
    color: colors.background.primary,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.background.primary,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  sectionContent: {
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 8,
    marginBottom: 4,
  },
  metricContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  metricLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    flex: 1,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricText: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricUnit: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  slowOpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  slowOpLabel: {
    fontSize: 13,
    color: colors.neutral[700],
    flex: 1,
  },
  slowOpValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  errorTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  errorTypeLabel: {
    fontSize: 13,
    color: colors.neutral[700],
    textTransform: 'capitalize',
  },
  errorTypeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  recommendationItem: {
    paddingVertical: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.neutral[400],
    marginVertical: 20,
  },
});

export default React.memo(PerformanceDevTools);
