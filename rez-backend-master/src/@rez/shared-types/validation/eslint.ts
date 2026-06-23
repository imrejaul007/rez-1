// @ts-nocheck
/**
 * ESLint Rule: Require Validation Middleware
 *
 * This rule ensures that Express routes validate request body, query, and params
 * before accessing them. It helps prevent injection attacks and ensures data integrity.
 *
 * Usage in .eslintrc.js:
 *   const { rules } = require('@rez/shared/validation/eslint');
 *   module.exports = {
 *     rules: {
 *       '@rez/require-validation': 'warn',
 *     },
 *   };
 *
 * Note: This is a placeholder rule definition. Actual implementation would require
 * a custom ESLint plugin or a more sophisticated AST analysis.
 */

export const ruleName = '@rez/require-validation';
export const ruleDescription = 'Require validation middleware on Express routes';

/**
 * Recommended configuration:
 *
 * In your ESLint config:
 *
 * ```json
 * {
 *   "rules": {
 *     "@rez/require-validation": ["warn", {
 *       "bodyRequired": true,
 *       "queryRequired": false,
 *       "strictMode": true
 *     }]
 *   }
 * }
 * ```
 *
 * The rule checks:
 * 1. Routes that access req.body should have validateBody() middleware
 * 2. Routes that access req.query should have validateQuery() middleware
 * 3. Routes with path params (:id) should have validateParams() middleware
 *
 * This is a best-effort rule and may have false positives/negatives.
 * For strict validation, use TypeScript's tsc with strict mode.
 */

/**
 * Validation requirement checker
 *
 * In your route handlers, use this pattern:
 *
 * ```typescript
 * // GOOD: Validation before access
 * router.post('/users',
 *   validateBody(createUserSchema),  // ✅ Validated
 *   async (req, res) => {
 *     const { name, email } = req.body; // Safe to use
 *   }
 * );
 *
 * // BAD: No validation
 * router.post('/users', async (req, res) => {
 *   const { name, email } = req.body; // ⚠️ Not validated
 * });
 * ```
 */

/**
 * TypeScript configuration for validation
 *
 * Enable strict mode in tsconfig.json:
 *
 * ```json
 * {
 *   "compilerOptions": {
 *     "strict": true,
 *     "noPropertyAccessFromIndexSignature": true
 *   }
 * }
 * ```
 *
 * This will catch many validation issues at compile time.
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require validation middleware on Express routes',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          bodyRequired: { type: 'boolean' },
          queryRequired: { type: 'boolean' },
          strictMode: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: { report: (msg: unknown) => void }) {
    return {
      // This would need actual AST analysis to implement fully
      // For now, this is a documentation placeholder
    };
  },
};
