import { Router, Request, Response } from 'express';
import { getAllArticles, createArticle, getArticleById, deleteArticle, updateReadingProgress, updateArticleTranslation } from '../lib/db';
import { VALID_DIFFICULTIES, VALID_CATEGORIES } from '../lib/types';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/articles
router.get('/', async (req: Request, res: Response) => {
  try {
    const difficulty = (req.query.difficulty as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const articles = await getAllArticles(req.userId!, { difficulty, category, search });
    res.json(articles);
  } catch (error) {
    console.error('GET /api/articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// POST /api/articles
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
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
    const article = await getArticleById(req.userId!, Number(req.params.id));

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
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
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
    await updateReadingProgress(req.userId!, Number(req.params.id), {
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

// POST /api/articles/:id/translate — generate Chinese translation
router.post('/:id/translate', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(req.userId!, Number(req.params.id));
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Idempotent: return existing translation if it includes the title
    if (article.translation) {
      const contentParaCount = article.content.split(/\n\s*\n/).filter((p: string) => p.trim()).length;
      const translationParaCount = article.translation.split(/\n\s*\n/).filter((p: string) => p.trim()).length;
      if (translationParaCount === contentParaCount + 1) {
        res.json({ translation: article.translation });
        return;
      }
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
    if (!endpoint || !apiKey) {
      res.status(503).json({ error: 'Azure OpenAI is not configured' });
      return;
    }

    const systemPrompt = `You are a professional English-to-Chinese translator. Translate the following English article into natural, fluent Chinese.

Rules:
- The first line of input is the article title. Translate it as the first line of output.
- Then translate the body paragraph by paragraph. The output must have the EXACT same number of paragraphs as the input (title line + body paragraphs).
- Separate the title and each body paragraph with double newlines (\\n\\n), matching the input structure.
- Do NOT add any extra paragraphs, notes, or explanations.
- Keep the translation accurate and natural for Chinese readers.`;

    const inputText = article.title + '\n\n' + article.content;

    const openaiUrl = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;
    const llmRes = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!llmRes.ok) {
      console.error('Azure OpenAI error:', llmRes.status, await llmRes.text());
      res.status(502).json({ error: 'Translation failed' });
      return;
    }

    const llmData = await llmRes.json() as { choices?: { message?: { content?: string } }[] };
    const translation = llmData.choices?.[0]?.message?.content;
    if (!translation) {
      res.status(502).json({ error: 'Empty translation response' });
      return;
    }

    await updateArticleTranslation(Number(req.params.id), translation);
    res.json({ translation });
  } catch (error) {
    console.error('POST /api/articles/:id/translate error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// POST /api/articles/:id — sendBeacon compatibility for reading progress
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    await updateReadingProgress(req.userId!, Number(req.params.id), {
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
