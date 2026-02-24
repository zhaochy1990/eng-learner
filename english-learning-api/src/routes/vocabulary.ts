import { Router, Request, Response } from 'express';
import { getVocabulary, saveWord, deleteWords } from '../lib/db';

const router = Router();

// GET /api/vocabulary
router.get('/', async (req: Request, res: Response) => {
  try {
    const mastery_level = req.query.mastery_level as string | undefined;
    const search = (req.query.search as string) || undefined;
    const sort = (req.query.sort as string) || undefined;

    const vocabulary = await getVocabulary(req.userId!, {
      mastery_level: mastery_level !== undefined && mastery_level !== '' ? Number(mastery_level) : undefined,
      search,
      sort,
    });

    res.json(vocabulary);
  } catch (error) {
    console.error('GET /api/vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// POST /api/vocabulary
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.word || !body.translation) {
      res.status(400).json({ error: 'Word and translation are required' });
      return;
    }

    const result = await saveWord(req.userId!, {
      word: body.word,
      phonetic: body.phonetic,
      translation: body.translation,
      pos: body.pos,
      definition: body.definition,
      context_sentence: body.context_sentence,
      context_article_id: body.context_article_id,
    });

    if (result.exists) {
      res.status(200).json({ id: result.id, message: 'Word already saved' });
      return;
    }

    res.status(201).json({ id: result.id });
  } catch (error) {
    console.error('POST /api/vocabulary error:', error);
    res.status(500).json({ error: 'Failed to save word' });
  }
});

// DELETE /api/vocabulary
router.delete('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.ids || !Array.isArray(body.ids)) {
      res.status(400).json({ error: 'Array of ids is required' });
      return;
    }

    if (body.ids.length > 200) {
      res.status(400).json({ error: 'Cannot delete more than 200 words at once' });
      return;
    }

    if (body.ids.length === 0) {
      res.json({ success: true });
      return;
    }

    await deleteWords(req.userId!, body.ids);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vocabulary error:', error);
    res.status(500).json({ error: 'Failed to delete words' });
  }
});

export default router;
