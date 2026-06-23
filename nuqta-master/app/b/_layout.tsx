/**
 * B-namespace layout
 * ===================
 *
 * Stack layout that wraps every screen under the `/b/...` migration namespace.
 *
 * Why this file exists
 * --------------------
 * All features migrated from project B (REZ) into Nuqta are namespaced under
 * `app/b/<feature>/<screen>.tsx` so they can never collide with Nuqta's
 * existing 250+ routes (see `REZ_MIGRATION_PLAN.md`). Every B screen mounts
 * inside this layout.
 *
 * Header policy
 * -------------
 * The native stack header is hidden — each B feature draws its own header so
 * we can use Nuqta's brand tokens and not leak the default expo-router chrome.
 *
 * Animation
 * ---------
 * Fade is used by default because most B features are overlays on top of the
 * existing app (e.g. the Savings Dashboard slots into the Home tab). Slide-up
 * transitions feel wrong for those flows; a fade is the closest to "fade in".
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function BLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
