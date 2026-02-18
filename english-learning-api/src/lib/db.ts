import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'app.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      category TEXT NOT NULL DEFAULT 'general',
      source_url TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      reading_time INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL UNIQUE,
      scroll_position REAL NOT NULL DEFAULT 0,
      current_sentence INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phonetic TEXT,
      translation TEXT NOT NULL,
      pos TEXT,
      definition TEXT,
      context_sentence TEXT,
      context_article_id INTEGER,
      mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),
      next_review_at TEXT NOT NULL DEFAULT (datetime('now')),
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_article_id) REFERENCES articles(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_next_review ON vocabulary(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON vocabulary(mastery_level);
    CREATE INDEX IF NOT EXISTS idx_reading_progress_article ON reading_progress(article_id);
  `);
}

const VALID_SORT_KEYS = ['date', 'alpha', 'mastery'] as const;
type SortKey = typeof VALID_SORT_KEYS[number];

const SORT_MAP: Record<SortKey, string> = {
  'date': 'v.created_at DESC',
  'alpha': 'v.word ASC',
  'mastery': 'v.mastery_level ASC, v.word ASC',
};

export function getAllArticles(filters?: {
  difficulty?: string;
  category?: string;
  search?: string;
}) {
  const db = getDb();
  let query = 'SELECT a.*, rp.scroll_position, rp.completed, rp.current_sentence FROM articles a LEFT JOIN reading_progress rp ON a.id = rp.article_id WHERE 1=1';
  const params: string[] = [];

  if (filters?.difficulty && filters.difficulty !== 'all') {
    query += ' AND a.difficulty = ?';
    params.push(filters.difficulty);
  }
  if (filters?.category && filters.category !== 'all') {
    query += ' AND a.category = ?';
    params.push(filters.category);
  }
  if (filters?.search) {
    query += ' AND (a.title LIKE ? OR a.content LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY a.created_at DESC';
  return db.prepare(query).all(...params);
}

export function getArticleById(id: number) {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, rp.scroll_position, rp.completed, rp.current_sentence
    FROM articles a
    LEFT JOIN reading_progress rp ON a.id = rp.article_id
    WHERE a.id = ?
  `).get(id);
}

export function createArticle(article: {
  title: string;
  content: string;
  summary?: string;
  difficulty?: string;
  category?: string;
  source_url?: string;
}) {
  const db = getDb();
  const wordCount = article.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const result = db.prepare(`
    INSERT INTO articles (title, content, summary, difficulty, category, source_url, word_count, reading_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    article.title,
    article.content,
    article.summary || article.content.substring(0, 200) + '...',
    article.difficulty || 'intermediate',
    article.category || 'general',
    article.source_url || null,
    wordCount,
    readingTime
  );

  return result.lastInsertRowid;
}

export function deleteArticle(id: number) {
  const db = getDb();
  return db.prepare('DELETE FROM articles WHERE id = ?').run(id);
}

export function updateReadingProgress(articleId: number, data: {
  scroll_position?: number;
  current_sentence?: number;
  completed?: boolean;
}) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM reading_progress WHERE article_id = ?').get(articleId);

  if (existing) {
    const updates: string[] = [];
    const params: (number | string)[] = [];

    if (data.scroll_position !== undefined) {
      updates.push('scroll_position = ?');
      params.push(data.scroll_position);
    }
    if (data.current_sentence !== undefined) {
      updates.push('current_sentence = ?');
      params.push(data.current_sentence);
    }
    if (data.completed !== undefined) {
      updates.push('completed = ?');
      params.push(data.completed ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push("last_read_at = datetime('now')");
    params.push(articleId);

    db.prepare(`UPDATE reading_progress SET ${updates.join(', ')} WHERE article_id = ?`).run(...params);
  } else {
    db.prepare(`
      INSERT INTO reading_progress (article_id, scroll_position, current_sentence, completed, last_read_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      articleId,
      data.scroll_position ?? 0,
      data.current_sentence ?? 0,
      data.completed ? 1 : 0
    );
  }
}

export function getLastReadArticle() {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, rp.scroll_position, rp.completed, rp.current_sentence
    FROM articles a
    JOIN reading_progress rp ON a.id = rp.article_id
    WHERE rp.completed = 0
    ORDER BY rp.last_read_at DESC
    LIMIT 1
  `).get();
}

export function getVocabulary(filters?: {
  mastery_level?: number;
  search?: string;
  sort?: string;
}) {
  const db = getDb();
  let query = 'SELECT v.*, a.title as article_title FROM vocabulary v LEFT JOIN articles a ON v.context_article_id = a.id WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.mastery_level !== undefined && filters.mastery_level >= 0) {
    query += ' AND v.mastery_level = ?';
    params.push(filters.mastery_level);
  }
  if (filters?.search) {
    query += ' AND (v.word LIKE ? OR v.translation LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const sortKey = (filters?.sort || 'date') as string;
  const orderBy = (VALID_SORT_KEYS as readonly string[]).includes(sortKey)
    ? SORT_MAP[sortKey as SortKey]
    : SORT_MAP['date'];
  query += ` ORDER BY ${orderBy}`;

  return db.prepare(query).all(...params);
}

export function saveWord(word: {
  word: string;
  phonetic?: string;
  translation: string;
  pos?: string;
  definition?: string;
  context_sentence?: string;
  context_article_id?: number;
}) {
  const db = getDb();
  const result = db.prepare(`
    INSERT OR IGNORE INTO vocabulary (word, phonetic, translation, pos, definition, context_sentence, context_article_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    word.word.toLowerCase(),
    word.phonetic || null,
    word.translation,
    word.pos || null,
    word.definition || null,
    word.context_sentence || null,
    word.context_article_id || null
  );

  if (result.changes === 0) {
    const existing = db.prepare('SELECT id FROM vocabulary WHERE word = ? COLLATE NOCASE').get(word.word) as { id: number };
    return { id: existing.id, exists: true };
  }

  return { id: result.lastInsertRowid, exists: false };
}

export function deleteWords(ids: number[]) {
  if (ids.length === 0) return { changes: 0 };
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`DELETE FROM vocabulary WHERE id IN (${placeholders})`).run(...ids);
}

export function getWordsForReview(mode: 'due' | 'new' | 'all' = 'due', limit = 30) {
  const db = getDb();
  let query: string;

  switch (mode) {
    case 'due':
      query = `SELECT * FROM vocabulary WHERE next_review_at <= datetime('now') ORDER BY next_review_at ASC LIMIT ?`;
      break;
    case 'new':
      query = `SELECT * FROM vocabulary WHERE review_count = 0 ORDER BY created_at DESC LIMIT ?`;
      break;
    case 'all':
      query = `SELECT * FROM vocabulary ORDER BY next_review_at ASC LIMIT ?`;
      break;
    default:
      query = `SELECT * FROM vocabulary WHERE next_review_at <= datetime('now') ORDER BY next_review_at ASC LIMIT ?`;
      break;
  }

  return db.prepare(query).all(limit);
}

export function getDueWordCount() {
  const db = getDb();
  const result = db.prepare(`SELECT COUNT(*) as count FROM vocabulary WHERE next_review_at <= datetime('now')`).get() as { count: number };
  return result.count;
}

export function updateWordReview(id: number, masteryLevel: number, nextReviewAt: string) {
  const db = getDb();
  db.prepare(`
    UPDATE vocabulary
    SET mastery_level = ?,
        next_review_at = ?,
        review_count = review_count + 1,
        last_reviewed_at = datetime('now')
    WHERE id = ?
  `).run(masteryLevel, nextReviewAt, id);
}

export function getStats() {
  const db = getDb();
  const totalWords = (db.prepare('SELECT COUNT(*) as count FROM vocabulary').get() as { count: number }).count;
  const masteredWords = (db.prepare('SELECT COUNT(*) as count FROM vocabulary WHERE mastery_level = 3').get() as { count: number }).count;
  const dueWords = getDueWordCount();
  const totalArticles = (db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number }).count;

  return { totalWords, masteredWords, dueWords, totalArticles };
}

export function getSavedWordSet(): Set<string> {
  const db = getDb();
  const words = db.prepare('SELECT word FROM vocabulary').all() as { word: string }[];
  return new Set(words.map(w => w.word.toLowerCase()));
}
