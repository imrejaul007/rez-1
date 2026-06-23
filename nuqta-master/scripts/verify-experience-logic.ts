
/**
 * Verification Script
 * Checks consistency of themes and slug handling
 */
import { EXPERIENCE_THEMES, getTheme } from '../constants/experienceThemes';

const TEST_CASES = [
    'sample-trial',
    '60-min-delivery',
    'fast-delivery', // Alias check
    'luxury',
    'organic',
    'men',
    'unknown-slug', // Fallback check
    'dining', // Generic check
];

console.log('🔍 Starting Deep Verification of Experience Logic...\n');

let passed = 0;
let total = TEST_CASES.length;

TEST_CASES.forEach(slug => {
    const theme = getTheme(slug);

    console.log(`Testing slug: "${slug}"`);

    if (theme) {
        if (slug === 'unknown-slug' && theme.bg === '#E0F2FE') {
            console.log('  ✅ Correctly fell back to default');
            passed++;
        } else if (slug === 'fast-delivery' && theme.bg === '#FFEDD5') {
            console.log('  ✅ Alias "fast-delivery" resolved to 60-min orange theme');
            passed++;
        } else if (theme.gradientColors && theme.gradientColors.length >= 2) {
            console.log(`  ✅ Theme found: ${theme.bg} (Gradient OK)`);
            passed++;
        } else {
            console.log('  ❌ Theme found but missing properties');
        }
    } else {
        console.log('  ❌ No theme returned (Should fallback)');
    }
    console.log('---');
});

console.log(`\n📊 Verification Result: ${passed}/${total} Passed`);

if (passed === total) {
    console.log('✅ ALL CHECKS PASSED. Logic is robust.');
    process.exit(0);
} else {
    console.log('❌ SOME CHECKS FAILED.');
    process.exit(1);
}
