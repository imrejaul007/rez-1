/**
 * Unit tests for the Daily Actions engine.
 *
 * Covers: ranking by priority, stable sort by actionId as tiebreaker,
 * truncation to MAX_ACTIONS_PER_DAY, defensive swallow of rule throws,
 * rule list injection for deterministic testing.
 */

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the rules registry so the engine's default import doesn't drag
// in the real rules (and their model dependencies).
jest.mock('../rules', () => ({ ALL_RULES: [] }));

import { runEngine, MAX_ACTIONS_PER_DAY, ENGINE_VERSION } from '../engine';
import type { Rule, RuleContext } from '../types';
import type { IDailyActionItem } from '../../../models/MerchantDailyAction';

const BASE_CTX: RuleContext = {
  merchantId: 'm1',
  storeId: 's1',
  vertical: 'restaurant',
  now: new Date('2026-04-23T10:00:00.000Z'),
};

function makeAction(id: string, priority: number): IDailyActionItem {
  return {
    actionId: id,
    kind: 'generic',
    title: id,
    description: id,
    priority,
    cta: { kind: 'deep-link', target: `/${id}` },
  };
}

function fixedRule(ruleId: string, items: IDailyActionItem[]): Rule {
  return {
    ruleId,
    description: `test rule ${ruleId}`,
    run: async () => items,
  };
}

describe('daily-actions engine', () => {
  it('exposes a sensible ENGINE_VERSION and MAX_ACTIONS_PER_DAY', () => {
    expect(ENGINE_VERSION).toBeGreaterThan(0);
    expect(MAX_ACTIONS_PER_DAY).toBeGreaterThan(0);
  });

  it('returns empty array when no rules registered', async () => {
    const result = await runEngine(BASE_CTX, []);
    expect(result).toEqual([]);
  });

  it('flattens outputs from multiple rules', async () => {
    const rules = [
      fixedRule('a', [makeAction('a1', 50)]),
      fixedRule('b', [makeAction('b1', 30), makeAction('b2', 10)]),
    ];
    const result = await runEngine(BASE_CTX, rules);
    expect(result.map((x) => x.actionId)).toEqual(['a1', 'b1', 'b2']);
  });

  it('sorts by priority descending', async () => {
    const rules = [
      fixedRule('r1', [makeAction('low', 10), makeAction('high', 90)]),
      fixedRule('r2', [makeAction('mid', 50)]),
    ];
    const result = await runEngine(BASE_CTX, rules);
    expect(result.map((x) => x.actionId)).toEqual(['high', 'mid', 'low']);
  });

  it('uses actionId as stable tiebreaker for equal priority', async () => {
    const rules = [
      fixedRule('r1', [makeAction('zulu', 50), makeAction('alpha', 50)]),
      fixedRule('r2', [makeAction('mike', 50)]),
    ];
    const result = await runEngine(BASE_CTX, rules);
    expect(result.map((x) => x.actionId)).toEqual(['alpha', 'mike', 'zulu']);
  });

  it('truncates to MAX_ACTIONS_PER_DAY', async () => {
    const items: IDailyActionItem[] = [];
    for (let i = 0; i < MAX_ACTIONS_PER_DAY + 3; i++) {
      items.push(makeAction(`x-${i}`, 50 - i));
    }
    const rules = [fixedRule('bulk', items)];
    const result = await runEngine(BASE_CTX, rules);
    expect(result.length).toBe(MAX_ACTIONS_PER_DAY);
    // Top-priority items retained (bigger priorities = smaller i).
    expect(result[0].actionId).toBe('x-0');
  });

  it('swallows rule throws — other rules still contribute', async () => {
    const thrower: Rule = {
      ruleId: 'boom',
      description: 'throws on run',
      run: async () => {
        throw new Error('boom');
      },
    };
    const rules = [thrower, fixedRule('ok', [makeAction('ok1', 50)])];
    const result = await runEngine(BASE_CTX, rules);
    expect(result.map((x) => x.actionId)).toEqual(['ok1']);
  });

  it('ignores rules that return empty arrays (no crashing, no entries)', async () => {
    const rules = [
      fixedRule('empty', []),
      fixedRule('full', [makeAction('f', 50)]),
    ];
    const result = await runEngine(BASE_CTX, rules);
    expect(result).toHaveLength(1);
    expect(result[0].actionId).toBe('f');
  });
});
