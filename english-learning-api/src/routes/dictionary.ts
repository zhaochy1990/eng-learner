import { Router, Request, Response } from 'express';
import { lookupWord } from '../lib/dictionary';

const router = Router();

// GET /api/dictionary
router.get('/', (req: Request, res: Response) => {
  try {
    const word = req.query.word as string | undefined;

    if (!word) {
      res.status(400).json({ error: 'Word parameter is required' });
      return;
    }

    const entry = lookupWord(word);

    if (!entry) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    res.json(entry);
  } catch (error) {
    console.error('GET /api/dictionary error:', error);
    res.status(500).json({ error: 'Dictionary lookup failed' });
  }
});

export default router;
