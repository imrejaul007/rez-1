import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Help Chat Page (Simplified version for help section)
// Uses the same chat system but with a different entry point

import SupportChatPage from '../support/chat';

export default withErrorBoundary(SupportChatPage, 'HelpChat');
