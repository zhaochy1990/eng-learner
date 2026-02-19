import sql from 'mssql';

function buildConfig(): sql.config {
  const base: sql.config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    port: Number(process.env.DB_PORT) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };

  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    base.user = process.env.DB_USER;
    base.password = process.env.DB_PASSWORD;
  } else {
    base.authentication = {
      type: 'azure-active-directory-default',
      options: {
        clientId: process.env.AZURE_CLIENT_ID,
      },
    };
  }

  return base;
}

const config = buildConfig();

let pool: sql.ConnectionPool | null = null;

export async function initPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect();
    await initializeSchema(pool);
  }
  return pool;
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    return initPool();
  }
  return pool;
}

async function initializeSchema(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'articles')
    CREATE TABLE articles (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(500) NOT NULL,
      content NVARCHAR(MAX) NOT NULL,
      summary NVARCHAR(MAX),
      difficulty NVARCHAR(20) NOT NULL DEFAULT 'intermediate',
      category NVARCHAR(50) NOT NULL DEFAULT 'general',
      source_url NVARCHAR(2000),
      word_count INT NOT NULL DEFAULT 0,
      reading_time INT NOT NULL DEFAULT 0,
      created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
  `);

  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'reading_progress')
      AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('reading_progress') AND name = 'user_id')
    BEGIN DROP TABLE reading_progress; END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reading_progress')
    CREATE TABLE reading_progress (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id NVARCHAR(36) NOT NULL,
      article_id INT NOT NULL,
      scroll_position FLOAT NOT NULL DEFAULT 0,
      current_sentence INT NOT NULL DEFAULT 0,
      completed INT NOT NULL DEFAULT 0,
      last_read_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      CONSTRAINT UQ_reading_progress_user_article UNIQUE (user_id, article_id)
    );
  `);

  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'vocabulary')
      AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vocabulary') AND name = 'user_id')
    BEGIN DROP TABLE vocabulary; END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vocabulary')
    CREATE TABLE vocabulary (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id NVARCHAR(36) NOT NULL,
      word NVARCHAR(200) NOT NULL,
      phonetic NVARCHAR(200),
      translation NVARCHAR(MAX) NOT NULL,
      pos NVARCHAR(50),
      definition NVARCHAR(MAX),
      context_sentence NVARCHAR(MAX),
      context_article_id INT,
      mastery_level INT NOT NULL DEFAULT 0,
      next_review_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
      review_count INT NOT NULL DEFAULT 0,
      last_reviewed_at DATETIME2,
      created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
      FOREIGN KEY (context_article_id) REFERENCES articles(id) ON DELETE SET NULL,
      CONSTRAINT UQ_vocabulary_user_word UNIQUE (user_id, word)
    );
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_vocabulary_user_word')
      CREATE INDEX idx_vocabulary_user_word ON vocabulary(user_id, word);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_vocabulary_user_next_review')
      CREATE INDEX idx_vocabulary_user_next_review ON vocabulary(user_id, next_review_at);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_vocabulary_user_mastery')
      CREATE INDEX idx_vocabulary_user_mastery ON vocabulary(user_id, mastery_level);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reading_progress_user_article')
      CREATE INDEX idx_reading_progress_user_article ON reading_progress(user_id, article_id);
  `);
}

function toISOString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString().replace('T', ' ').substring(0, 19);
  return String(val);
}

function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (key.endsWith('_at') && val instanceof Date) {
      mapped[key] = toISOString(val);
    } else {
      mapped[key] = val;
    }
  }
  return mapped;
}

const VALID_SORT_KEYS = ['date', 'alpha', 'mastery'] as const;
type SortKey = typeof VALID_SORT_KEYS[number];

const SORT_MAP: Record<SortKey, string> = {
  'date': 'v.created_at DESC',
  'alpha': 'v.word ASC',
  'mastery': 'v.mastery_level ASC, v.word ASC',
};

export async function getAllArticles(userId: string, filters?: {
  difficulty?: string;
  category?: string;
  search?: string;
}) {
  const p = await getPool();
  const request = p.request();
  request.input('userId', sql.NVarChar, userId);
  let query = 'SELECT a.*, rp.scroll_position, rp.completed, rp.current_sentence FROM articles a LEFT JOIN reading_progress rp ON a.id = rp.article_id AND rp.user_id = @userId WHERE 1=1';

  if (filters?.difficulty && filters.difficulty !== 'all') {
    query += ' AND a.difficulty = @difficulty';
    request.input('difficulty', sql.NVarChar, filters.difficulty);
  }
  if (filters?.category && filters.category !== 'all') {
    query += ' AND a.category = @category';
    request.input('category', sql.NVarChar, filters.category);
  }
  if (filters?.search) {
    query += ' AND (a.title LIKE @search OR a.content LIKE @search)';
    request.input('search', sql.NVarChar, `%${filters.search}%`);
  }

  query += ' ORDER BY a.created_at DESC';
  const result = await request.query(query);
  return result.recordset.map(mapRow);
}

export async function getArticleById(userId: string, id: number) {
  const p = await getPool();
  const result = await p.request()
    .input('id', sql.Int, id)
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT a.*, rp.scroll_position, rp.completed, rp.current_sentence
      FROM articles a
      LEFT JOIN reading_progress rp ON a.id = rp.article_id AND rp.user_id = @userId
      WHERE a.id = @id
    `);
  return result.recordset.length > 0 ? mapRow(result.recordset[0]) : undefined;
}

export async function createArticle(article: {
  title: string;
  content: string;
  summary?: string;
  difficulty?: string;
  category?: string;
  source_url?: string;
}) {
  const p = await getPool();
  const wordCount = article.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const result = await p.request()
    .input('title', sql.NVarChar, article.title)
    .input('content', sql.NVarChar(sql.MAX), article.content)
    .input('summary', sql.NVarChar(sql.MAX), article.summary || article.content.substring(0, 200) + '...')
    .input('difficulty', sql.NVarChar, article.difficulty || 'intermediate')
    .input('category', sql.NVarChar, article.category || 'general')
    .input('source_url', sql.NVarChar, article.source_url || null)
    .input('word_count', sql.Int, wordCount)
    .input('reading_time', sql.Int, readingTime)
    .query(`
      INSERT INTO articles (title, content, summary, difficulty, category, source_url, word_count, reading_time)
      VALUES (@title, @content, @summary, @difficulty, @category, @source_url, @word_count, @reading_time);
      SELECT SCOPE_IDENTITY() AS id;
    `);

  return result.recordset[0].id;
}

export async function deleteArticle(id: number) {
  const p = await getPool();
  return p.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM articles WHERE id = @id');
}

export async function updateReadingProgress(userId: string, articleId: number, data: {
  scroll_position?: number;
  current_sentence?: number;
  completed?: boolean;
}) {
  const p = await getPool();
  await p.request()
    .input('user_id', sql.NVarChar, userId)
    .input('article_id', sql.Int, articleId)
    .input('scroll_position', sql.Float, data.scroll_position ?? 0)
    .input('current_sentence', sql.Int, data.current_sentence ?? 0)
    .input('completed', sql.Int, data.completed ? 1 : 0)
    .query(`
      MERGE reading_progress AS target
      USING (SELECT @article_id AS article_id, @user_id AS user_id) AS source
      ON target.article_id = source.article_id AND target.user_id = source.user_id
      WHEN MATCHED THEN
        UPDATE SET
          scroll_position = CASE WHEN @scroll_position IS NOT NULL THEN @scroll_position ELSE target.scroll_position END,
          current_sentence = CASE WHEN @current_sentence IS NOT NULL THEN @current_sentence ELSE target.current_sentence END,
          completed = CASE WHEN @completed IS NOT NULL THEN @completed ELSE target.completed END,
          last_read_at = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT (user_id, article_id, scroll_position, current_sentence, completed, last_read_at)
        VALUES (@user_id, @article_id, @scroll_position, @current_sentence, @completed, GETUTCDATE());
    `);
}

export async function getLastReadArticle(userId: string) {
  const p = await getPool();
  const result = await p.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT TOP 1 a.*, rp.scroll_position, rp.completed, rp.current_sentence
      FROM articles a
      JOIN reading_progress rp ON a.id = rp.article_id
      WHERE rp.user_id = @userId AND rp.completed = 0
      ORDER BY rp.last_read_at DESC
    `);
  return result.recordset.length > 0 ? mapRow(result.recordset[0]) : undefined;
}

export async function getVocabulary(userId: string, filters?: {
  mastery_level?: number;
  search?: string;
  sort?: string;
}) {
  const p = await getPool();
  const request = p.request();
  request.input('userId', sql.NVarChar, userId);
  let query = 'SELECT v.*, a.title as article_title FROM vocabulary v LEFT JOIN articles a ON v.context_article_id = a.id WHERE 1=1 AND v.user_id = @userId';

  if (filters?.mastery_level !== undefined && filters.mastery_level >= 0) {
    query += ' AND v.mastery_level = @mastery_level';
    request.input('mastery_level', sql.Int, filters.mastery_level);
  }
  if (filters?.search) {
    query += ' AND (v.word LIKE @search OR v.translation LIKE @search)';
    request.input('search', sql.NVarChar, `%${filters.search}%`);
  }

  const sortKey = (filters?.sort || 'date') as string;
  const orderBy = (VALID_SORT_KEYS as readonly string[]).includes(sortKey)
    ? SORT_MAP[sortKey as SortKey]
    : SORT_MAP['date'];
  query += ` ORDER BY ${orderBy}`;

  const result = await request.query(query);
  return result.recordset.map(mapRow);
}

export async function saveWord(userId: string, word: {
  word: string;
  phonetic?: string;
  translation: string;
  pos?: string;
  definition?: string;
  context_sentence?: string;
  context_article_id?: number;
}) {
  const p = await getPool();
  try {
    const result = await p.request()
      .input('user_id', sql.NVarChar, userId)
      .input('word', sql.NVarChar, word.word.toLowerCase())
      .input('phonetic', sql.NVarChar, word.phonetic || null)
      .input('translation', sql.NVarChar(sql.MAX), word.translation)
      .input('pos', sql.NVarChar, word.pos || null)
      .input('definition', sql.NVarChar(sql.MAX), word.definition || null)
      .input('context_sentence', sql.NVarChar(sql.MAX), word.context_sentence || null)
      .input('context_article_id', sql.Int, word.context_article_id || null)
      .query(`
        INSERT INTO vocabulary (user_id, word, phonetic, translation, pos, definition, context_sentence, context_article_id)
        VALUES (@user_id, @word, @phonetic, @translation, @pos, @definition, @context_sentence, @context_article_id);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    return { id: result.recordset[0].id, exists: false };
  } catch (err: unknown) {
    const sqlErr = err as { number?: number };
    if (sqlErr.number === 2627 || sqlErr.number === 2601) {
      const existing = await p.request()
        .input('word', sql.NVarChar, word.word.toLowerCase())
        .input('user_id', sql.NVarChar, userId)
        .query('SELECT id FROM vocabulary WHERE word = @word AND user_id = @user_id');
      return { id: existing.recordset[0].id, exists: true };
    }
    throw err;
  }
}

export async function deleteWords(userId: string, ids: number[]) {
  if (ids.length === 0) return { changes: 0 };
  const p = await getPool();
  const request = p.request();
  request.input('userId', sql.NVarChar, userId);
  const placeholders: string[] = [];
  ids.forEach((id, i) => {
    const paramName = `id${i}`;
    request.input(paramName, sql.Int, id);
    placeholders.push(`@${paramName}`);
  });
  const result = await request.query(`DELETE FROM vocabulary WHERE id IN (${placeholders.join(',')}) AND user_id = @userId`);
  return { changes: result.rowsAffected[0] };
}

export async function getWordsForReview(userId: string, mode: 'due' | 'new' | 'all' = 'due', limit = 30) {
  const p = await getPool();
  let query: string;

  switch (mode) {
    case 'due':
      query = `SELECT * FROM vocabulary WHERE next_review_at <= GETUTCDATE() AND user_id = @userId ORDER BY next_review_at ASC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      break;
    case 'new':
      query = `SELECT * FROM vocabulary WHERE review_count = 0 AND user_id = @userId ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      break;
    case 'all':
      query = `SELECT * FROM vocabulary WHERE user_id = @userId ORDER BY next_review_at ASC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      break;
    default:
      query = `SELECT * FROM vocabulary WHERE next_review_at <= GETUTCDATE() AND user_id = @userId ORDER BY next_review_at ASC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      break;
  }

  const result = await p.request()
    .input('userId', sql.NVarChar, userId)
    .input('limit', sql.Int, limit)
    .query(query);
  return result.recordset.map(mapRow);
}

export async function getDueWordCount(userId: string) {
  const p = await getPool();
  const result = await p.request()
    .input('userId', sql.NVarChar, userId)
    .query(`SELECT COUNT(*) as count FROM vocabulary WHERE next_review_at <= GETUTCDATE() AND user_id = @userId`);
  return result.recordset[0].count;
}

export async function updateWordReview(userId: string, id: number, masteryLevel: number, nextReviewAt: string) {
  const p = await getPool();
  await p.request()
    .input('id', sql.Int, id)
    .input('userId', sql.NVarChar, userId)
    .input('mastery_level', sql.Int, masteryLevel)
    .input('next_review_at', sql.NVarChar, nextReviewAt)
    .query(`
      UPDATE vocabulary
      SET mastery_level = @mastery_level,
          next_review_at = @next_review_at,
          review_count = review_count + 1,
          last_reviewed_at = GETUTCDATE()
      WHERE id = @id AND user_id = @userId
    `);
}

export async function getStats(userId: string) {
  const p = await getPool();
  const result = await p.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
    SELECT
      (SELECT COUNT(*) FROM vocabulary WHERE user_id = @userId) AS totalWords,
      (SELECT COUNT(*) FROM vocabulary WHERE mastery_level = 3 AND user_id = @userId) AS masteredWords,
      (SELECT COUNT(*) FROM vocabulary WHERE next_review_at <= GETUTCDATE() AND user_id = @userId) AS dueWords,
      (SELECT COUNT(*) FROM articles) AS totalArticles
  `);
  return result.recordset[0];
}

