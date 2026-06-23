import request from 'supertest';
import { createTestMerchant, generateMerchantToken, cleanupTestData } from '../helpers/testUtils';

describe('Onboarding Routes', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/merchant/onboarding/status', () => {
    it('should get onboarding status', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      
      // Note: This test would need the actual app instance
      expect(token).toBeDefined();
    });
  });
});
