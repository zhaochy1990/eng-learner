/**
 * One-time migration script: SQLite (app.db) -> Azure SQL
 *
 * Usage:
 *   npx tsx scripts/migrate-data.ts
 *
 * Requires environment variables (or .env file):
 *   DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import sql from 'mssql';
import path from 'path';

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'app.db');

const config: sql.config = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

interface ArticleRow {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  difficulty: string;
  category: string;
  source_url: string | null;
  word_count: number;
  reading_time: number;
  created_at: string;
}

interface ReadingProgressRow {
  id: number;
  article_id: number;
  scroll_position: number;
  current_sentence: number;
  completed: number;
  last_read_at: string;
}

interface VocabularyRow {
  id: number;
  word: string;
  phonetic: string | null;
  translation: string;
  pos: string | null;
  definition: string | null;
  context_sentence: string | null;
  context_article_id: number | null;
  mastery_level: number;
  next_review_at: string;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

async function migrate() {
  console.log(`Opening SQLite database: ${SQLITE_PATH}`);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  console.log('Connecting to Azure SQL...');
  const pool = await new sql.ConnectionPool(config).connect();

  // Migrate articles
  const articles = sqlite.prepare('SELECT * FROM articles ORDER BY id').all() as ArticleRow[];
  console.log(`Migrating ${articles.length} articles...`);

  if (articles.length > 0) {
    await pool.request().query('SET IDENTITY_INSERT articles ON');
    for (const a of articles) {
      await pool.request()
        .input('id', sql.Int, a.id)
        .input('title', sql.NVarChar, a.title)
        .input('content', sql.NVarChar(sql.MAX), a.content)
        .input('summary', sql.NVarChar(sql.MAX), a.summary)
        .input('difficulty', sql.NVarChar, a.difficulty)
        .input('category', sql.NVarChar, a.category)
        .input('source_url', sql.NVarChar, a.source_url)
        .input('word_count', sql.Int, a.word_count)
        .input('reading_time', sql.Int, a.reading_time)
        .input('created_at', sql.NVarChar, a.created_at)
        .query(`
          INSERT INTO articles (id, title, content, summary, difficulty, category, source_url, word_count, reading_time, created_at)
          VALUES (@id, @title, @content, @summary, @difficulty, @category, @source_url, @word_count, @reading_time, @created_at)
        `);
    }
    await pool.request().query('SET IDENTITY_INSERT articles OFF');
    const maxId = articles[articles.length - 1].id;
    await pool.request().query(`DBCC CHECKIDENT ('articles', RESEED, ${maxId})`);
    console.log(`  Reseeded articles identity to ${maxId}`);
  }

  // Migrate reading_progress
  const progress = sqlite.prepare('SELECT * FROM reading_progress ORDER BY id').all() as ReadingProgressRow[];
  console.log(`Migrating ${progress.length} reading progress records...`);

  if (progress.length > 0) {
    await pool.request().query('SET IDENTITY_INSERT reading_progress ON');
    for (const rp of progress) {
      await pool.request()
        .input('id', sql.Int, rp.id)
        .input('article_id', sql.Int, rp.article_id)
        .input('scroll_position', sql.Float, rp.scroll_position)
        .input('current_sentence', sql.Int, rp.current_sentence)
        .input('completed', sql.Int, rp.completed)
        .input('last_read_at', sql.NVarChar, rp.last_read_at)
        .query(`
          INSERT INTO reading_progress (id, article_id, scroll_position, current_sentence, completed, last_read_at)
          VALUES (@id, @article_id, @scroll_position, @current_sentence, @completed, @last_read_at)
        `);
    }
    await pool.request().query('SET IDENTITY_INSERT reading_progress OFF');
    const maxId = progress[progress.length - 1].id;
    await pool.request().query(`DBCC CHECKIDENT ('reading_progress', RESEED, ${maxId})`);
    console.log(`  Reseeded reading_progress identity to ${maxId}`);
  }

  // Migrate vocabulary
  const vocab = sqlite.prepare('SELECT * FROM vocabulary ORDER BY id').all() as VocabularyRow[];
  console.log(`Migrating ${vocab.length} vocabulary words...`);

  if (vocab.length > 0) {
    await pool.request().query('SET IDENTITY_INSERT vocabulary ON');
    for (const v of vocab) {
      await pool.request()
        .input('id', sql.Int, v.id)
        .input('word', sql.NVarChar, v.word)
        .input('phonetic', sql.NVarChar, v.phonetic)
        .input('translation', sql.NVarChar(sql.MAX), v.translation)
        .input('pos', sql.NVarChar, v.pos)
        .input('definition', sql.NVarChar(sql.MAX), v.definition)
        .input('context_sentence', sql.NVarChar(sql.MAX), v.context_sentence)
        .input('context_article_id', sql.Int, v.context_article_id)
        .input('mastery_level', sql.Int, v.mastery_level)
        .input('next_review_at', sql.NVarChar, v.next_review_at)
        .input('review_count', sql.Int, v.review_count)
        .input('last_reviewed_at', sql.NVarChar, v.last_reviewed_at)
        .input('created_at', sql.NVarChar, v.created_at)
        .query(`
          INSERT INTO vocabulary (id, word, phonetic, translation, pos, definition, context_sentence, context_article_id, mastery_level, next_review_at, review_count, last_reviewed_at, created_at)
          VALUES (@id, @word, @phonetic, @translation, @pos, @definition, @context_sentence, @context_article_id, @mastery_level, @next_review_at, @review_count, @last_reviewed_at, @created_at)
        `);
    }
    await pool.request().query('SET IDENTITY_INSERT vocabulary OFF');
    const maxId = vocab[vocab.length - 1].id;
    await pool.request().query(`DBCC CHECKIDENT ('vocabulary', RESEED, ${maxId})`);
    console.log(`  Reseeded vocabulary identity to ${maxId}`);
  }

  sqlite.close();
  await pool.close();
  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
