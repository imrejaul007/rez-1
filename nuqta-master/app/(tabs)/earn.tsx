import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { Redirect } from 'expo-router';

// Redirect to Play & Earn page synchronously — no spinner flash.
// Uses Redirect component instead of useEffect + router.replace to avoid:
// 1. The spinner flash on every tab tap
// 2. Navigation loop when pressing back
function EarnScreen() {
  return <Redirect href="/playandearn" />;
}

export default withErrorBoundary(EarnScreen, '(tabs)Earn');
