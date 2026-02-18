import { Router, Request, Response } from 'express';
import { getWordsForReview, updateWordReview } from '../lib/db';
import { calculateNextReview, type Rating } from '../lib/spaced-repetition';

const router = Router();

const VALID_MODES = ['due', 'new', 'all'] as const;
type ReviewMode = typeof VALID_MODES[number];

const VALID_RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

// GET /api/vocabulary/review
router.get('/', async (req: Request, res: Response) => {
  try {
    const modeParam = (req.query.mode as string) || 'due';
    const mode: ReviewMode = (VALID_MODES as readonly string[]).includes(modeParam)
      ? (modeParam as ReviewMode)
      : 'due';
    const limit = Number(req.query.limit || '30');

    const words = await getWordsForReview(mode, limit);
    res.json(words);
  } catch (error) {
    console.error('GET /api/vocabulary/review error:', error);
    res.status(500).json({ error: 'Failed to fetch review words' });
  }
});

// POST /api/vocabulary/review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { wordId, rating, currentLevel } = req.body;

    if (!wordId || !rating) {
      res.status(400).json({ error: 'wordId and rating are required' });
      return;
    }

    if (!VALID_RATINGS.includes(rating)) {
      res.status(400).json({ error: 'Rating must be one of: again, hard, good, easy' });
      return;
    }

    const { newLevel, nextReviewAt } = calculateNextReview(currentLevel || 0, rating);
    await updateWordReview(wordId, newLevel, nextReviewAt);

    res.json({ newLevel, nextReviewAt });
  } catch (error) {
    console.error('POST /api/vocabulary/review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

export default router;
