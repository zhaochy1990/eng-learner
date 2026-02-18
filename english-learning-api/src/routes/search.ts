import { Router, Request, Response } from 'express';
import { VALID_DIFFICULTIES, VALID_CATEGORIES, Difficulty, Category } from '../lib/types';
import { fetchAllFeeds, FeedCategory } from '../lib/rss-feeds';

const router = Router();

const VALID_FEED_CATEGORIES = ['news', 'tech', 'business'] as const;

// GET /api/search?category=tech&q=keywords
router.get('/', async (req: Request, res: Response) => {
  try {
    const categoryParam = req.query.category as string | undefined;
    const q = (req.query.q as string || '').trim().toLowerCase();

    const category: FeedCategory | undefined =
      categoryParam && VALID_FEED_CATEGORIES.includes(categoryParam as FeedCategory)
        ? (categoryParam as FeedCategory)
        : undefined;

    let items = await fetchAllFeeds(category);

    // Optional keyword filter
    if (q) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.snippet.toLowerCase().includes(q)
      );
    }

    const results = items.slice(0, 30).map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      source: item.source,
      category: item.category,
      pubDate: item.pubDate,
    }));

    res.json(results);
  } catch (error) {
    console.error('GET /api/search error:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feeds' });
  }
});

// POST /api/search/extract
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
    if (!endpoint || !apiKey) {
      res.status(503).json({ error: 'Azure OpenAI is not configured' });
      return;
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Fetch the HTML
    const pageRes = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnglishLearningBot/1.0)' },
    });
    if (!pageRes.ok) {
      res.status(502).json({ error: `Failed to fetch URL (${pageRes.status})` });
      return;
    }

    let html = await pageRes.text();
    // Truncate to 100K chars
    if (html.length > 100_000) {
      html = html.slice(0, 100_000);
    }

    const systemPrompt = `You are an article extraction assistant. Given raw HTML of a web page, extract the main article content and return a JSON object with these fields:
- "title": the article title
- "content": the full article text as clean paragraphs (no HTML tags, no navigation/ads). Separate paragraphs with double newlines.
- "summary": a 1-2 sentence summary of the article
- "difficulty": one of "beginner", "intermediate", "advanced" based on vocabulary and sentence complexity
- "category": one of "business", "tech", "daily", "news", "general" based on the article topic

Return ONLY valid JSON, no other text.`;

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
          { role: 'user', content: html },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!llmRes.ok) {
      console.error('Azure OpenAI error:', llmRes.status, await llmRes.text());
      res.status(502).json({ error: 'LLM extraction failed' });
      return;
    }

    const llmData = await llmRes.json() as { choices?: { message?: { content?: string } }[] };
    const message = llmData.choices?.[0]?.message?.content;
    if (!message) {
      res.status(502).json({ error: 'Empty LLM response' });
      return;
    }

    const parsed = JSON.parse(message);

    // Validate and default difficulty/category
    const difficulty: Difficulty = VALID_DIFFICULTIES.includes(parsed.difficulty)
      ? parsed.difficulty
      : 'intermediate';
    const validCategory: Category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'general';

    res.json({
      title: parsed.title || 'Untitled',
      content: parsed.content || '',
      summary: parsed.summary || '',
      difficulty,
      category: validCategory,
    });
  } catch (error) {
    console.error('POST /api/search/extract error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

export default router;
