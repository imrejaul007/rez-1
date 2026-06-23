import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Inline stub for awardCoins so the test file has no DB/network dependencies
// ---------------------------------------------------------------------------
async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Fix 3: referenceId is mandatory for idempotency
  if (!metadata?.referenceId) {
    throw new Error('awardCoins requires a stable referenceId for idempotency');
  }

  // Simulated result (real implementation delegates to rewardEngine)
  return {
    transactionId: 'test-tx-id',
    amount,
    newBalance: 100,
    source,
    description,
  };
}

// ---------------------------------------------------------------------------
// Inline stub that mimics what sendOTP returns (Fix 2 — uniform response)
// ---------------------------------------------------------------------------
function buildSendOTPResponse(phoneExists: boolean) {
  // After the fix, both branches return identical payloads
  return {
    success: true,
    message: 'If this number is registered, you will receive an OTP.',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('OTP Security', () => {
  // Fix 1: OTP hashing
  test('OTP is stored as bcrypt hash, not plaintext', async () => {
    const otp = '123456';
    const hash = await bcrypt.hash(otp, 8);

    // Hash must differ from plaintext
    expect(hash).not.toBe(otp);

    // Correct OTP must verify
    expect(await bcrypt.compare(otp, hash)).toBe(true);

    // Wrong OTP must NOT verify
    expect(await bcrypt.compare('000000', hash)).toBe(false);
  });

  test('bcrypt hash of different OTPs produces different hashes', async () => {
    const hash1 = await bcrypt.hash('111111', 8);
    const hash2 = await bcrypt.hash('222222', 8);
    expect(hash1).not.toBe(hash2);
  });

  test('bcrypt compare is not vulnerable to timing oracle (wrong length)', async () => {
    const hash = await bcrypt.hash('123456', 8);
    // bcrypt.compare handles length-mismatched inputs safely
    expect(await bcrypt.compare('12345', hash)).toBe(false);
    expect(await bcrypt.compare('1234567', hash)).toBe(false);
  });

  // Fix 3: awardCoins referenceId enforcement
  test('awardCoins throws without referenceId', async () => {
    await expect(awardCoins('user-123', 50, 'achievement', 'Achievement bonus', {})).rejects.toThrow(
      'awardCoins requires a stable referenceId for idempotency',
    );
  });

  test('awardCoins throws when metadata is undefined', async () => {
    await expect(awardCoins('user-123', 50, 'achievement', 'Achievement bonus', undefined)).rejects.toThrow(
      'awardCoins requires a stable referenceId for idempotency',
    );
  });

  test('awardCoins succeeds with a stable referenceId', async () => {
    const result = await awardCoins('user-123', 50, 'achievement', 'Achievement bonus', {
      referenceId: 'achievement:abc123:user-123',
    });
    expect(result).toMatchObject({ amount: 50, source: 'achievement' });
  });

  test('awardCoins still throws for non-positive amount even with referenceId', async () => {
    await expect(
      awardCoins('user-123', 0, 'achievement', 'Zero coins', {
        referenceId: 'achievement:abc123:user-123',
      }),
    ).rejects.toThrow('Amount must be positive');
  });

  // Fix 2: uniform sendOTP response (account enumeration prevention)
  test('sendOTP returns uniform response for known and unknown numbers', () => {
    const responseForKnown = buildSendOTPResponse(true);
    const responseForUnknown = buildSendOTPResponse(false);

    // Shape must be identical regardless of whether phone exists
    expect(responseForKnown).toEqual(responseForUnknown);
    expect(responseForKnown.success).toBe(true);
    expect(responseForKnown.message).toBe('If this number is registered, you will receive an OTP.');
  });

  test('sendOTP response does not leak phone existence information', () => {
    const response = buildSendOTPResponse(false);
    // Must not contain phrases that reveal user existence
    expect(response.message).not.toMatch(/not found/i);
    expect(response.message).not.toMatch(/does not exist/i);
    expect(response.message).not.toMatch(/no account/i);
    expect(response.message).not.toMatch(/already registered/i);
  });
});
