import { Router, Request, Response } from 'express';
import { lookupWord } from '../lib/dictionary';

const router = Router();

// POST /api/translate
router.post('/', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text parameter is required' });
      return;
    }

    const words = text.split(/\s+/);

    if (words.length === 1) {
      const entry = lookupWord(words[0]);
      res.json({
        text,
        translation: entry?.translation || 'Translation not available',
        source: 'dictionary',
      });
      return;
    }

    const translations: string[] = [];
    for (const word of words) {
      const entry = lookupWord(word);
      if (entry?.translation) {
        const firstTrans = entry.translation.split('\n')[0].replace(/^[a-z]\.\s*/, '');
        translations.push(firstTrans);
      }
    }

    res.json({
      text,
      translation: translations.length > 0 ? translations.join('; ') : 'Translation not available',
      source: 'dictionary-composite',
    });
  } catch (error) {
    console.error('POST /api/translate error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
