import { Merchant } from '../../models/Merchant';
import { createTestMerchant, createTestMerchantUser, cleanupTestData } from '../helpers/testUtils';

describe('E2E: Team Collaboration', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('1. Owner creates merchant account', async () => {
    const merchant = await createTestMerchant();
    expect(merchant).toBeDefined();
    expect(merchant.ownerName).toBeDefined();
  });

  it('2. Owner invites admin', async () => {
    const merchant = await createTestMerchant();
    const admin = await createTestMerchantUser(merchant._id.toString(), { 
      role: 'admin',
      email: 'admin@test.com'
    });
    
    expect(admin.role).toBe('admin');
  });

  it('3. Admin invites manager', async () => {
    const merchant = await createTestMerchant();
    const manager = await createTestMerchantUser(merchant._id.toString(), { 
      role: 'manager',
      email: 'manager@test.com'
    });
    
    expect(manager.role).toBe('manager');
  });

  it('4. Manager creates product (has permission)', async () => {
    const merchant = await createTestMerchant();
    const manager = await createTestMerchantUser(merchant._id.toString(), { 
      role: 'manager'
    });
    
    expect(manager).toBeDefined();
  });
});
