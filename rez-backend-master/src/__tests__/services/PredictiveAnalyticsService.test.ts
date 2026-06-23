import { PredictiveAnalyticsService } from '../../merchantservices/PredictiveAnalyticsService';
import { createTestMerchant, createTestOrder, cleanupTestData } from '../helpers/testUtils';

describe('PredictiveAnalyticsService', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('forecastSales', () => {
    it('should forecast sales for next period', async () => {
      const merchant = await createTestMerchant();
      const forecast = await PredictiveAnalyticsService.forecastSales(
        merchant._id.toString(),
        30
      );
      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast)).toBe(true);
    });
  });

  describe('predictStockout', () => {
    it('should predict potential stockouts', async () => {
      const merchant = await createTestMerchant();
      const predictions = await PredictiveAnalyticsService.predictStockout(
        merchant._id.toString()
      );
      expect(predictions).toBeDefined();
    });
  });
});
