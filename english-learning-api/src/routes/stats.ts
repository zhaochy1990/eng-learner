import { Router, Request, Response } from 'express';
import { getStats, getLastReadArticle } from '../lib/db';

const router = Router();

// GET /api/stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const stats = await getStats(req.userId!);
    const lastRead = await getLastReadArticle(req.userId!);

    res.json({
      ...stats,
      lastReadArticle: lastRead || null,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
