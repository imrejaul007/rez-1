// Re-export the canonical singleton client from services/apiClient.ts.
// This module existed historically as a parallel API client implementation;
// now it just forwards to the single source of truth so existing
// `import { apiClient } from '@/utils/apiClient'` imports keep working
// without forcing a refactor of every consumer.

import apiClient from '@/services/apiClient';

export { apiClient };
export { apiClient as default } from '@/services/apiClient';

// Re-export types so consumers don't need to change their imports.
export type { ApiResponse } from '@/services/apiClient';
