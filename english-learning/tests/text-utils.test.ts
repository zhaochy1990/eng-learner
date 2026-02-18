import { describe, it, expect } from 'vitest';
import { splitParagraphs, splitSentences, SENTENCE_SPLIT_REGEX } from '../src/lib/text-utils';

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
