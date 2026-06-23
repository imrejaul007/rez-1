// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  rules: {
    // Warn on hardcoded hex color literals — use design tokens from @/constants/theme instead
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
        message: 'Avoid hardcoded hex colors. Use design tokens from @/constants/theme instead.',
      },
    ],
  },
  overrides: [
    {
      // Allow hex literals in token definition files (where they belong)
      files: [
        'constants/theme.ts',
        'constants/Colors.ts',
        'constants/OffersTheme.ts',
        'constants/categoryThemes.ts',
        'constants/experienceThemes.ts',
        'constants/brand.ts',
      ],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
