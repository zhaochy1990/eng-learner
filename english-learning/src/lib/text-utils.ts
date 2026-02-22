// Shared text splitting utilities (C6 fix)
// Used by both article-reader.tsx and use-tts.ts — must stay in sync.

import type { Article } from '@/lib/types';

/**
 * Regex to split a paragraph into sentences.
 * Matches text ending with . ! or ? followed by whitespace or end-of-string,
 * plus any trailing text without sentence-ending punctuation.
 */
export const SENTENCE_SPLIT_REGEX = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;

/**
 * Split text into paragraphs by double newlines.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Split a paragraph string into sentence strings.
 */
export function splitSentences(paragraph: string): string[] {
  const matches = paragraph
    .match(SENTENCE_SPLIT_REGEX)
    ?.map((s) => s.trim())
    .filter((s) => s.length > 0);
  return matches && matches.length > 0 ? matches : [paragraph];
}

/**
 * Calculate reading progress for an article based on current_sentence vs total sentences.
 * Returns null if article has never been opened, 100 if completed, or 0-99 otherwise.
 */
export function getReadingProgress(article: Article): number | null {
  if (article.current_sentence == null && article.completed == null) {
    return null;
  }
  if (article.completed === 1) return 100;
  if (article.current_sentence != null && article.current_sentence > 0) {
    const totalSentences = splitParagraphs(article.content)
      .reduce((sum, para) => sum + splitSentences(para).length, 0);
    if (totalSentences === 0) return 0;
    return Math.min(Math.round((article.current_sentence / totalSentences) * 100), 99);
  }
  return 0;
}

const INFLECTION_RULES: [RegExp, string[]][] = [
  [/ies$/i, ['y']],
  [/ves$/i, ['fe', 'f']],
  [/ses$/i, ['se', 's', '']],
  [/es$/i, ['e', '']],
  [/s$/i, ['']],
  [/ied$/i, ['y']],
  [/ed$/i, ['e', '']],
  [/ing$/i, ['e', '', 'ing']],
  [/er$/i, ['e', '']],
  [/est$/i, ['e', '']],
];

/**
 * Given an inflected word, return possible base forms (including itself).
 * Mirrors the backend INFLECTION_RULES in dictionary.ts.
 */
export function getBaseForms(word: string): string[] {
  const lower = word.toLowerCase();
  const forms = [lower];
  for (const [pattern, replacements] of INFLECTION_RULES) {
    if (pattern.test(lower)) {
      for (const r of replacements) {
        const base = lower.replace(pattern, r);
        if (base && base !== lower && base.length >= 2) forms.push(base);
      }
    }
  }
  return forms;
}
