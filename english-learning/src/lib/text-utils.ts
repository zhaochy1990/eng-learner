// Shared text splitting utilities (C6 fix)
// Used by both article-reader.tsx and use-tts.ts — must stay in sync.

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
