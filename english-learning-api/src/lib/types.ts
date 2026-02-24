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

export const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = typeof VALID_DIFFICULTIES[number];

export const VALID_CATEGORIES = ['business', 'tech', 'daily', 'news', 'general'] as const;
export type Category = typeof VALID_CATEGORIES[number];

export interface Novel {
  id: number;
  title: string;
  author?: string;
  cover_image_url?: string | null;
  description?: string;
  difficulty: string;
  total_chapters: number;
  created_at?: string;
  // Computed from joins
  chapter_count?: number;
  total_word_count?: number;
  completed_chapters?: number;
  last_read_at?: string | null;
}

export interface NovelChapter {
  id: number;
  title: string;
  chapter_number: number;
  word_count: number;
  reading_time: number;
  scroll_position?: number | null;
  current_sentence?: number | null;
  completed?: number | null;
  last_read_at?: string | null;
}

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
