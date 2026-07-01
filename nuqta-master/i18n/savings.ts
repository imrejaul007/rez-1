/**
 * Savings Dashboard - Internationalization
 * Translation keys for all hardcoded strings in the Savings feature.
 */

export const savingsTranslations = {
  // Balance Card
  'savings.totalSaved': 'Total saved',
  'savings.thisMonth': 'This month',

  // Goals
  'savings.goals': 'Goals',
  'savings.noGoals': 'No goals yet',
  'savings.noGoalsHint': 'Tap "View all" to add one.',
  'savings.addGoal': 'Add a goal',
  'savings.goalName': 'Name',
  'savings.goalNamePlaceholder': 'e.g. Goa Trip',
  'savings.targetAmount': 'Target (₹)',
  'savings.deadline': 'Deadline',
  'savings.category': 'Category (optional)',
  'savings.save': 'Save',
  'savings.cancel': 'Cancel',

  // Goal Status
  'savings.completed': 'Completed!',
  'savings.overdue': 'Overdue',
  'savings.dueToday': 'Due today',
  'savings.daysLeft': '{{count}} day left',
  'savings.daysLeft_plural': '{{count}} days left',
  'savings.weeksLeft': '{{count}} week left',
  'savings.weeksLeft_plural': '{{count}} weeks left',

  // Streak
  'savings.streak': '{{count}} day streak',
  'savings.streak_plural': '{{count}} day streak',
  'savings.streakActive': 'Active',

  // History
  'savings.activity': 'Activity',
  'savings.noActivity': 'No activity yet',
  'savings.noActivityHint': 'Start shopping to earn cashback — entries appear here.',
  'savings.today': 'Today',
  'savings.yesterday': 'Yesterday',
  'savings.daysAgo': '{{count}} day ago',
  'savings.daysAgo_plural': '{{count}} days ago',
  'savings.weeksAgo': '{{count}} week ago',
  'savings.weeksAgo_plural': '{{count}} weeks ago',

  // Period Filter
  'savings.periodFilter': 'Filter by time period',
  'savings.period7d': '7 days',
  'savings.period30d': '30 days',
  'savings.period90d': '90 days',

  // Recommendations
  'savings.recommendations': 'Recommendations',
  'savings.noRecommendations': 'No recommendations right now.',

  // Actions
  'savings.viewAll': 'View all',
  'savings.tapToSeeMore': 'Tap to see more',
  'savings.back': 'Back',

  // Errors
  'savings.error': 'Error',
  'savings.errorGeneric': 'Something went wrong',
  'savings.errorNetwork': 'Network error. Please try again.',
  'savings.errorCreateGoal': 'Could not create goal — please try again',

  // Loading
  'savings.loading': 'Loading savings',

  // Empty States
  'savings.empty': 'Nothing here yet',
} as const;

export type SavingsTranslationKey = keyof typeof savingsTranslations;
