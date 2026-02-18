import { Router, Request, Response } from 'express';
import { getAllArticles, createArticle, getArticleById, deleteArticle, updateReadingProgress } from '../lib/db';
import { VALID_DIFFICULTIES, VALID_CATEGORIES } from '../lib/types';

const router = Router();

// GET /api/articles
router.get('/', async (req: Request, res: Response) => {
  try {
    const difficulty = (req.query.difficulty as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const articles = await getAllArticles({ difficulty, category, search });
    res.json(articles);
  } catch (error) {
    console.error('GET /api/articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// POST /api/articles
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.title || !body.content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    if (body.difficulty && !(VALID_DIFFICULTIES as readonly string[]).includes(body.difficulty)) {
      res.status(400).json({ error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }

    if (body.category && !(VALID_CATEGORIES as readonly string[]).includes(body.category)) {
      res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
      return;
    }

    const id = await createArticle({
      title: body.title,
      content: body.content,
      summary: body.summary,
      difficulty: body.difficulty,
      category: body.category,
      source_url: body.source_url,
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('POST /api/articles error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// GET /api/articles/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(Number(req.params.id));

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(article);
  } catch (error) {
    console.error('GET /api/articles/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// DELETE /api/articles/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteArticle(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/articles/:id error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// PATCH /api/articles/:id — update reading progress
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    await updateReadingProgress(Number(req.params.id), {
      scroll_position: body.scroll_position,
      current_sentence: body.current_sentence,
      completed: body.completed,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/articles/:id error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// POST /api/articles/:id — sendBeacon compatibility for reading progress
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    await updateReadingProgress(Number(req.params.id), {
      scroll_position: body.scroll_position,
      current_sentence: body.current_sentence,
      completed: body.completed,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/articles/:id error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
