export interface Article {
  id: number;
  title: string;
  content: string;
  summary?: string;
  difficulty?: string;
  category?: string;
  source_url?: string | null;
  word_count?: number;
  reading_time?: number;
  created_at?: string;
  updated_at?: string;
  article_type?: string;
  translation?: string | null;
  scroll_position?: number | null;
  completed?: number | null;
  current_sentence?: number | null;
}

export interface VocabularyItem {
  id: number;
  word: string;
  phonetic: string | null;
  translation: string;
  pos: string | null;
  definition: string | null;
  context_sentence: string | null;
  context_article_id: number | null;
  article_title?: string | null;
  mastery_level: number;
  next_review_at: string;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export const VALID_ARTICLE_TYPES = ['article', 'novel'] as const;
export type ArticleType = typeof VALID_ARTICLE_TYPES[number];

export const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = typeof VALID_DIFFICULTIES[number];

export const VALID_CATEGORIES = ['business', 'tech', 'daily', 'news', 'general'] as const;
export type Category = typeof VALID_CATEGORIES[number];

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  category?: string;
  pubDate?: string | null;
}

export interface ExtractedArticle {
  title: string;
  content: string;
  summary: string;
  difficulty: Difficulty;
  category: Category;
}
