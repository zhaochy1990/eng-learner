import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initPool } from './lib/db';
import articlesRouter from './routes/articles';
import vocabularyRouter from './routes/vocabulary';
import reviewRouter from './routes/review';
import exportRouter from './routes/export';
import dictionaryRouter from './routes/dictionary';
import translateRouter from './routes/translate';
import statsRouter from './routes/stats';
import searchRouter from './routes/search';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());

// Mount routes — order matters: more specific paths first
app.use('/api/vocabulary/review', reviewRouter);
app.use('/api/vocabulary/export', exportRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/dictionary', dictionaryRouter);
app.use('/api/translate', translateRouter);
app.use('/api/stats', statsRouter);
app.use('/api/search', searchRouter);

(async () => {
  try {
    await initPool();
    console.log('Database connected and schema initialized');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
})();
