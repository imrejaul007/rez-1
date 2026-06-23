import { MiniGame } from '../models/MiniGame';
import { CoinTransaction } from '../models/CoinTransaction';
import { Coupon } from '../models/Coupon';
import { UserCoupon } from '../models/UserCoupon';
import { Wallet } from '../models/Wallet';
import mongoose from 'mongoose';

interface ScratchCardPrize {
  type: 'coins' | 'cashback' | 'discount' | 'voucher' | 'nothing';
  value: number;
  label: string;
  color: string;
}

interface ScratchCardConfig {
  gridSize: number; // 3x3 = 9 cells
  prizes: ScratchCardPrize[];
  winningPattern: number[]; // Array of cell indices that contain the prize
}

const SCRATCH_CARD_PRIZES: ScratchCardPrize[] = [
  { type: 'coins', value: 100, label: '100 Coins', color: '#10B981' },
  { type: 'coins', value: 200, label: '200 Coins', color: '#3B82F6' },
  { type: 'coins', value: 500, label: '500 Coins', color: '#8B5CF6' },
  { type: 'cashback', value: 10, label: '10% Cashback', color: '#F59E0B' },
  { type: 'discount', value: 15, label: '15% Discount', color: '#EC4899' },
  { type: 'voucher', value: 50, label: '₹50 Voucher', color: '#EF4444' },
  { type: 'nothing', value: 0, label: 'Better Luck Next Time', color: '#6B7280' }
];

const PRIZE_WEIGHTS = {
  coins_100: 25,
  coins_200: 15,
  coins_500: 5,
  cashback_10: 15,
  discount_15: 10,
  voucher_50: 5,
  nothing: 25
};

/**
 * Create a new scratch card session
 */
export async function createScratchCard(userId: string): Promise<any> {
  // Expire old active scratch cards
  await MiniGame.updateMany(
    {
      user: userId,
      gameType: 'scratch_card',
      status: 'active'
    },
    {
      status: 'expired'
    }
  );

  // Generate scratch card configuration
  const prize = selectScratchCardPrize();
  const gridSize = 9; // 3x3 grid

  // Determine winning cells (3 matching cells for a win)
  const winningCells = generateWinningPattern(gridSize);

  // Create grid with prizes
  const grid = new Array(gridSize).fill(null).map((_, index) => {
    if (winningCells.includes(index)) {
      return {
        index,
        prize: prize.label,
        type: prize.type,
        value: prize.value,
        revealed: false
      };
    }
    // Fill other cells with random prizes (mostly "nothing")
    const randomPrize = Math.random() > 0.7
      ? SCRATCH_CARD_PRIZES[Math.floor(Math.random() * (SCRATCH_CARD_PRIZES.length - 1))]
      : SCRATCH_CARD_PRIZES[SCRATCH_CARD_PRIZES.length - 1]; // "nothing"

    return {
      index,
      prize: randomPrize.label,
      type: randomPrize.type,
      value: randomPrize.value,
      revealed: false
    };
  });

  // Create session (expires in 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const scratchCard = await MiniGame.create({
    user: userId,
    gameType: 'scratch_card',
    status: 'active',
    expiresAt,
    metadata: {
      grid,
      winningCells,
      winningPrize: prize,
      scratchedCells: [],
      revealed: false,
      gridSize: 3 // 3x3
    }
  });

  return {
    sessionId: scratchCard._id,
    gridSize: 3,
    totalCells: gridSize,
    expiresAt,
    // Don't reveal the grid data to client
    cells: new Array(gridSize).fill({ revealed: false })
  };
}

/**
 * Select a prize based on weighted probability
 */
function selectScratchCardPrize(): ScratchCardPrize {
  const totalWeight = Object.values(PRIZE_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  if (random < PRIZE_WEIGHTS.coins_100) {
    return SCRATCH_CARD_PRIZES[0]; // 100 coins
  } else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200) {
    return SCRATCH_CARD_PRIZES[1]; // 200 coins
  } else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500) {
    return SCRATCH_CARD_PRIZES[2]; // 500 coins
  } else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10) {
    return SCRATCH_CARD_PRIZES[3]; // 10% cashback
  } else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10 + PRIZE_WEIGHTS.discount_15) {
    return SCRATCH_CARD_PRIZES[4]; // 15% discount
  } else if (random < PRIZE_WEIGHTS.coins_100 + PRIZE_WEIGHTS.coins_200 + PRIZE_WEIGHTS.coins_500 + PRIZE_WEIGHTS.cashback_10 + PRIZE_WEIGHTS.discount_15 + PRIZE_WEIGHTS.voucher_50) {
    return SCRATCH_CARD_PRIZES[5]; // ₹50 voucher
  }

  return SCRATCH_CARD_PRIZES[6]; // Nothing
}

/**
 * Generate winning pattern (3 matching cells)
 */
function generateWinningPattern(gridSize: number): number[] {
  const patterns = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal \
    [2, 4, 6]  // Diagonal /
  ];

  // Select random pattern
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Scratch a cell
 */
export async function scratchCell(sessionId: string, cellIndex: number): Promise<any> {
  const scratchCard = await MiniGame.findById(sessionId);

  if (!scratchCard) {
    throw new Error('Scratch card not found');
  }

  if (scratchCard.status === 'completed') {
    throw new Error('Scratch card already completed');
  }

  if (scratchCard.status === 'expired') {
    throw new Error('Scratch card has expired');
  }

  if (new Date() > scratchCard.expiresAt) {
    scratchCard.status = 'expired';
    await scratchCard.save();
    throw new Error('Scratch card has expired');
  }

  const grid = scratchCard.metadata?.grid || [];
  const scratchedCells = scratchCard.metadata?.scratchedCells || [];
  const winningCells = scratchCard.metadata?.winningCells || [];

  if (cellIndex < 0 || cellIndex >= grid.length) {
    throw new Error('Invalid cell index');
  }

  if (scratchedCells.includes(cellIndex)) {
    throw new Error('Cell already scratched');
  }

  // Mark cell as scratched
  grid[cellIndex].revealed = true;
  scratchedCells.push(cellIndex);

  // Check if all winning cells are scratched
  const allWinningCellsScratched = winningCells.every((cell: number) =>
    scratchedCells.includes(cell)
  );

  let won = false;
  let prize = null;

  if (allWinningCellsScratched) {
    won = true;
    prize = scratchCard.metadata?.winningPrize;

    if (prize && scratchCard.metadata) {
      scratchCard.status = 'completed';
      scratchCard.completedAt = new Date();
      scratchCard.reward = {
        [prize.type]: prize.value
      };
      scratchCard.metadata.revealed = true;

      // Award prize with idempotency key to prevent duplicate awards on retry
      if (prize.type !== 'nothing') {
        await awardScratchCardPrize(scratchCard.user.toString(), prize, String(scratchCard._id));
      }
    }
  }

  // Update metadata
  scratchCard.metadata = {
    ...scratchCard.metadata,
    grid,
    scratchedCells
  };

  await scratchCard.save();

  return {
    sessionId: scratchCard._id,
    cellIndex,
    cellData: grid[cellIndex],
    scratchedCells,
    won,
    prize: won ? prize : null,
    completed: scratchCard.status === 'completed',
    allCellsRevealed: scratchedCells.length === grid.length
  };
}

/**
 * Award scratch card prize
 * Uses sessionId as idempotency key to prevent duplicate awards on retry
 */
async function awardScratchCardPrize(userId: string, prize: ScratchCardPrize, sessionId: string): Promise<void> {
  const idempotencyKey = `scratch_card:${sessionId}:${prize.type}`;

  if (prize.type === 'coins') {
    const { rewardEngine } = await import('../core/rewardEngine');
    await rewardEngine.issue({
      userId,
      amount: prize.value,
      rewardType: 'scratch_card',
      source: 'scratch_card',
      description: `Won ${prize.value} coins from Scratch Card`,
      operationType: 'scratch_card_prize',
      referenceId: `scratch:${sessionId}:coins`,
      referenceModel: 'ScratchCardSession',
      metadata: { idempotencyKey, sessionId },
    });
  } else if (prize.type === 'cashback') {
    const cashbackAmount = prize.value;
    const { rewardEngine } = await import('../core/rewardEngine');
    await rewardEngine.issue({
      userId,
      amount: cashbackAmount,
      rewardType: 'scratch_card',
      source: 'scratch_card',
      description: `Won ${prize.value}% cashback from Scratch Card (${cashbackAmount} NC credited)`,
      operationType: 'scratch_card_prize',
      referenceId: `scratch:${sessionId}:cashback`,
      referenceModel: 'ScratchCardSession',
      metadata: { prizeType: 'cashback', cashbackPercentage: prize.value, idempotencyKey, sessionId },
    });
  } else if (prize.type === 'discount') {
    // Idempotency: check if coupon already created for this session
    const existingCoupon = await UserCoupon.findOne({
      user: new mongoose.Types.ObjectId(userId),
      'metadata.idempotencyKey': idempotencyKey
    }).lean();
    if (existingCoupon) return;

    const couponCode = `SC-${prize.value}OFF-${Date.now().toString(36).toUpperCase()}`;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const coupon = await Coupon.create({
      couponCode,
      title: `${prize.value}% Off - Scratch Card Prize`,
      description: `Won ${prize.value}% discount from Scratch Card`,
      discountType: 'PERCENTAGE',
      discountValue: prize.value,
      minOrderValue: 0,
      maxDiscountCap: 500,
      validFrom: new Date(),
      validTo: expiryDate,
      usageLimit: { totalUsage: 1, perUser: 1, usedCount: 0 },
      applicableTo: { categories: [], products: [], stores: [], userTiers: ['all'] },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: ['Won from Scratch Card game', 'Valid for 7 days', 'Single use only'],
      createdBy: new mongoose.Types.ObjectId(userId),
      tags: ['scratch_card', 'game_prize'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      metadata: { source: 'scratch_card', idempotencyKey, sessionId }
    });

    await UserCoupon.create({
      user: new mongoose.Types.ObjectId(userId),
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      status: 'available',
      metadata: { idempotencyKey, sessionId }
    });
  } else if (prize.type === 'voucher') {
    // Idempotency: check if voucher already created for this session
    const existingVoucher = await UserCoupon.findOne({
      user: new mongoose.Types.ObjectId(userId),
      'metadata.idempotencyKey': idempotencyKey
    }).lean();
    if (existingVoucher) return;

    const couponCode = `SC-V${prize.value}-${Date.now().toString(36).toUpperCase()}`;
    const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const coupon = await Coupon.create({
      couponCode,
      title: `₹${prize.value} Voucher - Scratch Card Prize`,
      description: `Won ₹${prize.value} voucher from Scratch Card`,
      discountType: 'FIXED',
      discountValue: prize.value,
      minOrderValue: prize.value * 2,
      maxDiscountCap: prize.value,
      validFrom: new Date(),
      validTo: expiryDate,
      usageLimit: { totalUsage: 1, perUser: 1, usedCount: 0 },
      applicableTo: { categories: [], products: [], stores: [], userTiers: ['all'] },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: [
        'Won from Scratch Card game',
        'Valid for 14 days',
        `Minimum order value: ₹${prize.value * 2}`,
        'Single use only'
      ],
      createdBy: new mongoose.Types.ObjectId(userId),
      tags: ['scratch_card', 'game_prize', 'voucher'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      metadata: { source: 'scratch_card', idempotencyKey, sessionId }
    });

    await UserCoupon.create({
      user: new mongoose.Types.ObjectId(userId),
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      status: 'available',
      metadata: { idempotencyKey, sessionId }
    });
  }
}

/**
 * Claim scratch card (reveal all cells)
 */
export async function claimScratchCard(sessionId: string): Promise<any> {
  const scratchCard = await MiniGame.findById(sessionId).lean();

  if (!scratchCard) {
    throw new Error('Scratch card not found');
  }

  if (scratchCard.status === 'completed') {
    throw new Error('Scratch card already completed');
  }

  // Reveal all cells
  const grid = scratchCard.metadata?.grid || [];
  grid.forEach((cell: any) => {
    cell.revealed = true;
  });

  scratchCard.status = 'completed';
  scratchCard.completedAt = new Date();
  scratchCard.metadata = {
    ...scratchCard.metadata,
    grid,
    revealed: true,
    scratchedCells: grid.map((_: any, index: number) => index)
  };

  await scratchCard.save();

  return {
    sessionId: scratchCard._id,
    grid,
    winningCells: scratchCard.metadata?.winningCells,
    winningPrize: scratchCard.metadata?.winningPrize,
    completed: true
  };
}

/**
 * Get scratch card history
 */
export async function getScratchCardHistory(userId: string, limit: number = 10): Promise<any[]> {
  const cards = await MiniGame.find({
    user: userId,
    gameType: 'scratch_card',
    status: 'completed'
  })
    .sort({ completedAt: -1 })
    .limit(limit).lean();

  return cards.map(c => ({
    id: c._id,
    completedAt: c.completedAt,
    prize: c.metadata?.winningPrize,
    reward: c.reward
  }));
}

/**
 * Get scratch card statistics
 */
export async function getScratchCardStats(userId: string): Promise<any> {
  const cards = await MiniGame.find({
    user: userId,
    gameType: 'scratch_card',
    status: 'completed'
  }).lean();

  const totalCards = cards.length;
  let totalWins = 0;
  let totalCoinsWon = 0;
  let totalCashbackWon = 0;
  let totalDiscountsWon = 0;
  let totalVouchersWon = 0;

  cards.forEach(card => {
    const prize = card.metadata?.winningPrize;
    if (prize && prize.type !== 'nothing') {
      totalWins++;
      if (card.reward?.coins) totalCoinsWon += card.reward.coins;
      if (card.reward?.cashback) totalCashbackWon += card.reward.cashback;
      if (card.reward?.discount) totalDiscountsWon += card.reward.discount;
      if (card.reward?.voucher) totalVouchersWon += 1;
    }
  });

  return {
    totalCards,
    totalWins,
    winRate: totalCards > 0 ? Math.round((totalWins / totalCards) * 100) : 0,
    totalCoinsWon,
    totalCashbackWon,
    totalDiscountsWon,
    totalVouchersWon
  };
}

export default {
  createScratchCard,
  scratchCell,
  claimScratchCard,
  getScratchCardHistory,
  getScratchCardStats
};
