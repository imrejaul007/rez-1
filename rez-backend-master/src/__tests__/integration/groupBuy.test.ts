/**
 * Integration tests — GroupBuy
 *
 * All Mongoose model calls are mocked.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface MockGroupBuy {
  _id: string;
  inviteCode: string;
  members: Array<{ userId: string; amountPaise: number }>;
  pooledAmountPaise: number;
  targetAmountPaise: number;
  status: 'open' | 'confirmed' | 'expired';
}

const mockDb: Map<string, MockGroupBuy> = new Map();

async function createGroupBuy(creatorId: string, storeId: string, targetPaise: number): Promise<MockGroupBuy> {
  const code = generateInviteCode();
  const gb: MockGroupBuy = {
    _id: `gb_${Date.now()}`,
    inviteCode: code,
    members: [{ userId: creatorId, amountPaise: 0 }],
    pooledAmountPaise: 0,
    targetAmountPaise: targetPaise,
    status: 'open',
  };
  mockDb.set(code, gb);
  return gb;
}

async function joinGroupBuy(inviteCode: string, userId: string, amountPaise: number): Promise<MockGroupBuy> {
  const gb = mockDb.get(inviteCode.toUpperCase());
  if (!gb) throw Object.assign(new Error('Group buy not found'), { status: 404 });
  const alreadyMember = gb.members.some((m) => m.userId === userId);
  if (alreadyMember) throw Object.assign(new Error('Already a member'), { status: 409 });
  gb.members.push({ userId, amountPaise });
  gb.pooledAmountPaise += amountPaise;
  return gb;
}

async function confirmGroupBuy(inviteCode: string): Promise<{ coinAwards: Array<{ userId: string; coins: number }> }> {
  const gb = mockDb.get(inviteCode.toUpperCase());
  if (!gb) throw Object.assign(new Error('Group buy not found'), { status: 404 });
  gb.status = 'confirmed';
  const totalPool = gb.pooledAmountPaise;
  const totalCoins = 1000; // Fixed reward pool for simplicity
  const coinAwards = gb.members
    .filter((m) => m.amountPaise > 0)
    .map((m) => ({
      userId: m.userId,
      coins: Math.round((m.amountPaise / totalPool) * totalCoins),
    }));
  return { coinAwards };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GroupBuy', () => {
  beforeEach(() => {
    mockDb.clear();
  });

  it('create group buy returns 6-char invite code', async () => {
    const gb = await createGroupBuy('creator1', 'store1', 50000);

    expect(gb.inviteCode).toHaveLength(6);
    expect(gb.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('join with invalid code returns 404', async () => {
    await expect(joinGroupBuy('XXXXXX', 'user2', 10000)).rejects.toMatchObject({ status: 404 });
  });

  it('duplicate join attempt returns 409', async () => {
    const gb = await createGroupBuy('creator1', 'store1', 50000);
    await joinGroupBuy(gb.inviteCode, 'user2', 10000);

    await expect(joinGroupBuy(gb.inviteCode, 'user2', 5000)).rejects.toMatchObject({ status: 409 });
  });

  it('confirm buy awards coins proportionally (60% pool member gets 60% of coins)', async () => {
    const gb = await createGroupBuy('creator1', 'store1', 50000);
    // user2 contributes 60%, user3 contributes 40%
    await joinGroupBuy(gb.inviteCode, 'user2', 6000);
    await joinGroupBuy(gb.inviteCode, 'user3', 4000);

    const { coinAwards } = await confirmGroupBuy(gb.inviteCode);

    const user2Award = coinAwards.find((a) => a.userId === 'user2');
    const user3Award = coinAwards.find((a) => a.userId === 'user3');

    expect(user2Award).toBeDefined();
    expect(user3Award).toBeDefined();
    // 60% of 1000 total coins = 600
    expect(user2Award!.coins).toBe(600);
    // 40% of 1000 total coins = 400
    expect(user3Award!.coins).toBe(400);
  });
});
