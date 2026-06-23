import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgramListItem, SpecialProgramSlug } from '@/services/specialProgramApi';
import { Colors, Spacing } from '@/constants/DesignSystem';
import { specialPrograms } from '@/hooks/usePlayAndEarnData';
import { earnStyles as styles } from './styles';

interface SpecialProgramsSectionProps {
  apiSpecialPrograms: ProgramListItem[];
  specialProgramsLoaded: boolean;
  selectedProgramSlug: SpecialProgramSlug | null;
  setSelectedProgramSlug: (slug: SpecialProgramSlug | null) => void;
  navigateTo: (path: string) => void;
}

const SpecialProgramsSection = React.memo(function SpecialProgramsSection({
  apiSpecialPrograms,
  specialProgramsLoaded,
  setSelectedProgramSlug,
}: SpecialProgramsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="ribbon" size={24} color={Colors.warning} />
        <Text style={styles.sectionTitle}>Special Programs</Text>
      </View>

      {(specialProgramsLoaded && apiSpecialPrograms.length === 0) ? (
        <Text style={{ color: Colors.text.tertiary, textAlign: 'center', paddingVertical: Spacing.base }}>
          No programs available right now
        </Text>
      ) : (apiSpecialPrograms.length > 0
        ? apiSpecialPrograms.map((program) => (
          <Pressable
            key={program.slug}
            style={styles.programCard}
            onPress={() => setSelectedProgramSlug(program.slug)}
          >
            <View style={styles.programHeader}>
              <View style={styles.programIconContainer}>
                <Ionicons name={(program.icon || 'ribbon') as keyof typeof Ionicons.glyphMap} size={28} color={Colors.warning} />
              </View>
              <View style={styles.programContent}>
                <View style={styles.programTitleRow}>
                  <Text style={styles.programTitle}>{program.name}</Text>
                  <Text style={styles.programBadge}>{program.badge}</Text>
                </View>
                <View style={styles.programRewards}>
                  {program.benefits.slice(0, 3).map((benefit, idx) => (
                    <View key={idx} style={styles.programRewardItem}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.gold} />
                      <Text style={styles.programRewardText}>{benefit.title}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.programEarnings}>{program.earningsDisplayText}</Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.eligibilityButton,
                program.userStatus === 'active_member' && styles.eligibilityButtonActive,
                (program.userStatus === 'suspended' || program.userStatus === 'revoked') && styles.eligibilityButtonSuspended,
              ]}
              onPress={(e) => { e.stopPropagation(); setSelectedProgramSlug(program.slug); }}
            >
              <Text style={[
                styles.eligibilityText,
                program.userStatus === 'active_member' && styles.eligibilityTextActive,
                (program.userStatus === 'suspended' || program.userStatus === 'revoked') && styles.eligibilityTextSuspended,
              ]}>
                {program.userStatus === 'active_member' ? 'Active Member'
                  : program.userStatus === 'eligible' ? 'Activate Now'
                  : program.userStatus === 'pending_verification' ? 'Under Review'
                  : program.userStatus === 'suspended' ? 'Suspended'
                  : program.userStatus === 'revoked' ? 'Revoked'
                  : program.userStatus === 'expired' ? 'Expired'
                  : 'Check Eligibility'}
              </Text>
            </Pressable>
          </Pressable>
        ))
        : specialPrograms.map((program) => (
          <Pressable
            key={program.id}
            style={styles.programCard}
            onPress={() => setSelectedProgramSlug(
              program.id === 'student' ? 'student_zone'
                : program.id === 'corporate' ? 'corporate_perks'
                : 'nuqta_prive'
            )}
          >
            <View style={styles.programHeader}>
              <View style={styles.programIconContainer}>
                <Ionicons name={program.icon} size={28} color={Colors.warning} />
              </View>
              <View style={styles.programContent}>
                <View style={styles.programTitleRow}>
                  <Text style={styles.programTitle}>{program.title}</Text>
                  <Text style={styles.programBadge}>{program.badge}</Text>
                </View>
                <View style={styles.programRewards}>
                  {program.rewards.map((reward, idx) => (
                    <View key={idx} style={styles.programRewardItem}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.gold} />
                      <Text style={styles.programRewardText}>{reward}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.programEarnings}>{program.earnings}</Text>
              </View>
            </View>
            <Pressable style={styles.eligibilityButton} onPress={(e) => {
              e.stopPropagation();
              setSelectedProgramSlug(
                program.id === 'student' ? 'student_zone'
                  : program.id === 'corporate' ? 'corporate_perks'
                  : 'nuqta_prive'
              );
            }}>
              <Text style={styles.eligibilityText}>Check Eligibility</Text>
            </Pressable>
          </Pressable>
        ))
      )}
    </View>
  );
});

export default SpecialProgramsSection;
