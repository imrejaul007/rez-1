import { AnalyticsService } from '../../merchantservices/AnalyticsService';
import { createTestMerchant, createTestOrder, cleanupTestData } from '../helpers/testUtils';

describe('AnalyticsService', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('getSalesOverview', () => {
    it('should return sales overview for merchant', async () => {
      const merchant = await createTestMerchant();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const overview = await AnalyticsService.getSalesOverview(
        merchant._id.toString(),
        startDate,
        endDate
      );
      expect(overview).toBeDefined();
    });
  });
});
