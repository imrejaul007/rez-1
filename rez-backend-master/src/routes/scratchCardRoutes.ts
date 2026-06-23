// ScratchCard Routes
// Routes for scratch card functionality

import { Router } from 'express';
import {
  createScratchCard,
  getUserScratchCards,
  scratchCard,
  claimPrize,
  checkEligibility
} from '../controllers/scratchCardController';
import { authenticate } from '../middleware/auth';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// PHASE 3 — disabled until core is stable
router.use(requireGamificationFeature('miniGames', { cards: [] }));

/**
 * @route   GET /api/scratch-cards/eligibility
 * @desc    Check if user is eligible for scratch card
 * @access  Private
 */
router.get('/eligibility', checkEligibility);

/**
 * @route   GET /api/scratch-cards
 * @desc    Get user's scratch cards
 * @access  Private
 */
router.get('/', getUserScratchCards);

/**
 * @route   POST /api/scratch-cards
 * @desc    Create a new scratch card for user
 * @access  Private
 */
router.post('/', createScratchCard);

/**
 * @route   POST /api/scratch-cards/:id/scratch
 * @desc    Scratch a card to reveal prize
 * @access  Private
 */
router.post('/:id/scratch', scratchCard);

/**
 * @route   POST /api/scratch-cards/:id/claim
 * @desc    Claim prize from scratch card
 * @access  Private
 */
router.post('/:id/claim', claimPrize);

export default router;
