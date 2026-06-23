#!/usr/bin/env node
/**
 * Fix common issues in failing test files:
 * 1. Replace HTML elements (div, span, button) with React Native (View, Text, Pressable)
 * 2. Add __resetModuleState() reset for GamificationContext tests
 * 3. Add useRouter/useSegments mocks
 */
const fs = require('fs');
const path = require('path');

const files = [
  '__tests__/gamification/QuizGame.test.tsx',
  '__tests__/gamification/SpinWheel.test.tsx',
  '__tests__/gamification/ScratchCard.test.tsx',
  '__tests__/gamification/ChallengesFlow.test.tsx',
  '__tests__/games/GamesPage.test.tsx',
  '__tests__/games/GamificationContext.test.tsx',
  '__tests__/games/QuizGame.test.tsx',
  '__tests__/games/SpinWheelGame.test.tsx',
  '__tests__/ugc/PlayPage.test.tsx',
  '__tests__/gamification/PointsSystem.test.tsx',
  '__tests__/accessibility/forms.test.tsx',
  '__tests__/accessibility/cart-checkout.test.tsx',
  '__tests__/accessibility/lists-grids.test.tsx',
  '__tests__/accessibility/payment.test.tsx',
  '__tests__/accessibility/dynamic-content.test.tsx',
  '__tests__/accessibility/modals.test.tsx',
  '__tests__/accessibility/navigation.test.tsx',
];

const rootDir = path.resolve(__dirname, '..');

let count = 0;
for (const f of files) {
  const full = path.join(rootDir, f);
  if (!fs.existsSync(full)) continue;
  let content = fs.readFileSync(full, 'utf-8');
  const orig = content;

  // Replace <div with <RNView and add import
  // Replace </div> with </RNView>
  // Replace <span with <RNText
  // Replace </span> with </RNText>
  // Replace <button with <RNPressable and onClick with onPress
  // Replace </button> with </RNPressable>

  // Simpler approach: just import the RN components at the top
  if (content.includes('<div') || content.includes('<button') || content.includes('<span')) {
    if (!content.includes('require(\'react-native\')')) {
      const importLine = "const { View: RNView, Text: RNText, Pressable: RNPressable } = require('react-native');\n";
      // Add after first import
      const firstImport = content.indexOf('import ');
      if (firstImport >= 0) {
        const endOfLine = content.indexOf('\n', firstImport);
        content = content.slice(0, endOfLine + 1) + importLine + content.slice(endOfLine + 1);
      }
    }

    // Now replace HTML elements
    content = content.replace(/<div(\s|>)/g, '<RNView$1');
    content = content.replace(/<\/div>/g, '</RNView>');
    content = content.replace(/<span(\s|>)/g, '<RNText$1');
    content = content.replace(/<\/span>/g, '</RNText>');
    content = content.replace(/<button(\s|>)/g, '<RNPressable$1');
    content = content.replace(/<\/button>/g, '</RNPressable>');
    content = content.replace(/onClick=/g, 'onPress=');
  }

  if (content !== orig) {
    fs.writeFileSync(full, content);
    count++;
    console.log(`Updated: ${f}`);
  }
}

console.log(`\nTotal: ${count} files updated`);
