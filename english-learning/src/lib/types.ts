// Shared types used across the application (C5 fix)

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
  novel_id?: number | null;
  chapter_number?: number | null;
  // From reading_progress join
  scroll_position?: number | null;
  completed?: number | null;
  current_sentence?: number | null;
}

export interface Novel {
  id: number;
  title: string;
  author?: string;
  cover_image_url?: string | null;
  description?: string;
  difficulty: string;
  total_chapters: number;
  created_at?: string;
  chapter_count?: number;
  total_word_count?: number;
  completed_chapters?: number;
  last_read_at?: string | null;
  chapters?: NovelChapter[];
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

export const VALID_CATEGORIES = ['business', 'tech', 'daily', 'news', 'general', 'novel'] as const;
export type Category = typeof VALID_CATEGORIES[number];

export const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};
