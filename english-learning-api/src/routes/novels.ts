import { Router, Request, Response } from 'express';
import { getAllNovels, getNovelById, createNovel, updateNovel, deleteNovel, createChapter } from '../lib/db';
import { VALID_DIFFICULTIES } from '../lib/types';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/novels
router.get('/', async (req: Request, res: Response) => {
  try {
    const novels = await getAllNovels(req.userId!);
    res.json(novels);
  } catch (error) {
    console.error('GET /api/novels error:', error);
    res.status(500).json({ error: 'Failed to fetch novels' });
  }
});

// POST /api/novels
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (body.difficulty && !(VALID_DIFFICULTIES as readonly string[]).includes(body.difficulty)) {
      res.status(400).json({ error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }

    const id = await createNovel({
      title: body.title,
      author: body.author,
      cover_image_url: body.cover_image_url,
      description: body.description,
      difficulty: body.difficulty,
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('POST /api/novels error:', error);
    res.status(500).json({ error: 'Failed to create novel' });
  }
});

// GET /api/novels/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const novel = await getNovelById(req.userId!, Number(req.params.id));

    if (!novel) {
      res.status(404).json({ error: 'Novel not found' });
      return;
    }

    res.json(novel);
  } catch (error) {
    console.error('GET /api/novels/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch novel' });
  }
});

// PUT /api/novels/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.difficulty !== undefined && !(VALID_DIFFICULTIES as readonly string[]).includes(body.difficulty)) {
      res.status(400).json({ error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }

    const updated = await updateNovel(Number(req.params.id), {
      title: body.title,
      author: body.author,
      cover_image_url: body.cover_image_url,
      description: body.description,
      difficulty: body.difficulty,
    });
    if (!updated) {
      res.status(404).json({ error: 'Novel not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/novels/:id error:', error);
    res.status(500).json({ error: 'Failed to update novel' });
  }
});

// DELETE /api/novels/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await deleteNovel(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/novels/:id error:', error);
    res.status(500).json({ error: 'Failed to delete novel' });
  }
});

// POST /api/novels/:id/chapters
router.post('/:id/chapters', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.title || !body.content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const novel = await getNovelById(req.userId!, Number(req.params.id));
    if (!novel) {
      res.status(404).json({ error: 'Novel not found' });
      return;
    }

    const chapters = (novel.chapters ?? []) as Array<{ chapter_number: number }>;
    const chapterNumber = body.chapter_number ?? (chapters.length + 1);

    const id = await createChapter(Number(req.params.id), {
      title: body.title,
      content: body.content,
      chapter_number: chapterNumber,
    });

    res.status(201).json({ id, chapter_number: chapterNumber });
  } catch (error) {
    console.error('POST /api/novels/:id/chapters error:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

export default router;
