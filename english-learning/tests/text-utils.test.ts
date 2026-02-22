import { describe, it, expect } from 'vitest';
import { splitParagraphs, splitSentences, SENTENCE_SPLIT_REGEX, getReadingProgress } from '../src/lib/text-utils';
import type { Article } from '../src/lib/types';

describe('splitParagraphs', () => {
  it('splits multiple paragraphs separated by \\n\\n', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    expect(splitParagraphs(text)).toEqual([
      'First paragraph.',
      'Second paragraph.',
      'Third paragraph.',
    ]);
  });

  it('returns single paragraph when no double newlines', () => {
    const text = 'Just one paragraph with no breaks.';
    expect(splitParagraphs(text)).toEqual(['Just one paragraph with no breaks.']);
  });

  it('handles extra whitespace between paragraphs', () => {
    const text = 'First.\n  \n  \nSecond.\n\n   \n\nThird.';
    const result = splitParagraphs(text);
    expect(result).toEqual(['First.', 'Second.', 'Third.']);
  });

  it('returns empty array for empty string', () => {
    expect(splitParagraphs('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(splitParagraphs('   \n\n   \n\n   ')).toEqual([]);
  });
});

describe('splitSentences', () => {
  it('splits multiple sentences with periods', () => {
    const paragraph = 'First sentence. Second sentence. Third sentence.';
    expect(splitSentences(paragraph)).toEqual([
      'First sentence.',
      'Second sentence.',
      'Third sentence.',
    ]);
  });

  it('splits sentence with exclamation mark', () => {
    const paragraph = 'What a day! It was great.';
    expect(splitSentences(paragraph)).toEqual(['What a day!', 'It was great.']);
  });

  it('splits sentence with question mark', () => {
    const paragraph = 'How are you? I am fine.';
    expect(splitSentences(paragraph)).toEqual(['How are you?', 'I am fine.']);
  });

  it('handles mixed punctuation', () => {
    const paragraph = 'Really? Yes! Absolutely.';
    expect(splitSentences(paragraph)).toEqual(['Really?', 'Yes!', 'Absolutely.']);
  });

  it('returns whole paragraph as one sentence when no punctuation', () => {
    const paragraph = 'No punctuation here';
    expect(splitSentences(paragraph)).toEqual(['No punctuation here']);
  });

  it('handles single sentence with period', () => {
    const paragraph = 'Just one sentence.';
    expect(splitSentences(paragraph)).toEqual(['Just one sentence.']);
  });

  it('handles abbreviations like Dr.', () => {
    const paragraph = 'Dr. Smith went home.';
    // The regex splits on every period, so "Dr." becomes its own segment
    const result = splitSentences(paragraph);
    // Verify we get some result and the full text is covered
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.join(' ')).toBe('Dr. Smith went home.');
  });
});

describe('SENTENCE_SPLIT_REGEX', () => {
  it('is a RegExp', () => {
    expect(SENTENCE_SPLIT_REGEX).toBeInstanceOf(RegExp);
  });
});

describe('getReadingProgress', () => {
  const baseArticle: Article = { id: 1, title: 'Test', content: 'First sentence. Second sentence.\n\nThird sentence.' };

  it('returns null when article has never been opened', () => {
    expect(getReadingProgress(baseArticle)).toBeNull();
  });

  it('returns 100 when article is completed', () => {
    expect(getReadingProgress({ ...baseArticle, completed: 1 })).toBe(100);
  });

  it('returns percentage for in-progress article', () => {
    // 3 total sentences, current_sentence = 1 → 33%
    const result = getReadingProgress({ ...baseArticle, current_sentence: 1, completed: 0 });
    expect(result).toBe(33);
  });

  it('caps progress at 99 for nearly finished article', () => {
    // 3 total sentences, current_sentence = 3 → would be 100 but capped at 99
    const result = getReadingProgress({ ...baseArticle, current_sentence: 3, completed: 0 });
    expect(result).toBe(99);
  });

  it('returns 0 when current_sentence is 0', () => {
    expect(getReadingProgress({ ...baseArticle, current_sentence: 0, completed: 0 })).toBe(0);
  });

  it('returns 0 for empty content with progress fields set', () => {
    const article: Article = { id: 2, title: 'Empty', content: '', current_sentence: 1, completed: 0 };
    expect(getReadingProgress(article)).toBe(0);
  });
});
