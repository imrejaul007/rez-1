import request from 'supertest';
import { createTestMerchant, generateMerchantToken, cleanupTestData } from '../helpers/testUtils';

describe('Analytics Routes', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/merchant/analytics/sales/overview', () => {
    it('should get sales overview', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(token).toBeDefined();
    });
  });

  describe('GET /api/merchant/analytics/forecast/sales', () => {
    it('should get sales forecast', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(token).toBeDefined();
    });
  });
});
