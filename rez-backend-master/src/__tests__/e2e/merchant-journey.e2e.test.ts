import { Merchant } from '../../models/Merchant';
import { cleanupTestData, TEST_PASSWORD } from '../helpers/testUtils';

describe('E2E: Complete Merchant Journey', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});
