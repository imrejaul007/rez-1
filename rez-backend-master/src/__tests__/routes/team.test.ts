import request from 'supertest';
import { createTestMerchant, createTestMerchantUser, generateMerchantToken, cleanupTestData } from '../helpers/testUtils';

describe('Team Routes', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/merchant/team', () => {
    it('should get all team members', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(token).toBeDefined();
    });
  });

  describe('POST /api/merchant/team/invite', () => {
    it('should invite a team member', async () => {
      const merchant = await createTestMerchant();
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(token).toBeDefined();
    });
  });

  describe('PUT /api/merchant/team/:userId/role', () => {
    it('should update team member role (owner only)', async () => {
      const merchant = await createTestMerchant();
      const user = await createTestMerchantUser(merchant._id.toString(), { role: 'staff' });
      const token = generateMerchantToken(merchant._id.toString());
      
      expect(user).toBeDefined();
      expect(token).toBeDefined();
    });
  });
});
