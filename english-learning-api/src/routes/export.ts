import { Router, Request, Response } from 'express';
import { getVocabulary } from '../lib/db';

const router = Router();

function escapeCsv(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  const str = String(s);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

// GET /api/vocabulary/export
router.get('/', (req: Request, res: Response) => {
  try {
    const vocabulary = getVocabulary() as Array<{
      word: string;
      phonetic: string | null;
      translation: string;
      pos: string | null;
      context_sentence: string | null;
      mastery_level: number;
      created_at: string;
    }>;

    const header = 'Word,Phonetic,Translation,Part of Speech,Context,Mastery Level,Date Added\n';
    const rows = vocabulary.map(v => {
      return [
        escapeCsv(v.word),
        escapeCsv(v.phonetic),
        escapeCsv(v.translation),
        escapeCsv(v.pos),
        escapeCsv(v.context_sentence),
        escapeCsv(v.mastery_level),
        escapeCsv(v.created_at),
      ].join(',');
    }).join('\n');

    const csv = header + rows;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="vocabulary.csv"',
    }).send(csv);
  } catch (error) {
    console.error('GET /api/vocabulary/export error:', error);
    res.status(500).json({ error: 'Failed to export vocabulary' });
  }
});

export default router;
