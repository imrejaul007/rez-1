/**
 * Rules registry.
 *
 * Adding a new daily-action rule is a one-line change here:
 *   1. Create src/services/dailyActions/rules/myNewRule.ts exporting a `Rule`.
 *   2. Import + append here.
 * The engine picks up the new rule on next generation without any other
 * change.
 */

import type { Rule } from '../types';
import { reengageLapsedRule } from './reengageLapsedRule';
import { weekendRushRule } from './weekendRushRule';
import { launchFirstVisitRule } from './launchFirstVisitRule';

export const ALL_RULES: readonly Rule[] = [
  reengageLapsedRule,
  weekendRushRule,
  launchFirstVisitRule,
] as const;
