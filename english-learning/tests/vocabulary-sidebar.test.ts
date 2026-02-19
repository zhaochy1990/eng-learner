import { describe, it, expect } from 'vitest';
import { filterVocabularyByArticle, type VocabularyItem } from '../src/components/vocabulary-sidebar';

const word = (w: string, translation = '翻译'): VocabularyItem => ({
  word: w,
  phonetic: null,
  translation,
  pos: null,
  definition: null,
});

describe('filterVocabularyByArticle', () => {
  it('returns words that appear in the article', () => {
    const vocab = [word('apple'), word('banana'), word('cherry')];
    const content = 'I ate an apple and a cherry today.';
    const result = filterVocabularyByArticle(vocab, content);
    expect(result.map((v) => v.word)).toEqual(['apple', 'cherry']);
  });

  it('matches case-insensitively', () => {
    const vocab = [word('Hello'), word('world')];
    const content = 'HELLO World!';
    const result = filterVocabularyByArticle(vocab, content);
    expect(result.map((v) => v.word)).toEqual(['Hello', 'world']);
  });

  it('returns empty array when no matches', () => {
    const vocab = [word('cat'), word('dog')];
    const content = 'The weather is nice today.';
    expect(filterVocabularyByArticle(vocab, content)).toEqual([]);
  });

  it('returns empty array for empty vocabulary', () => {
    expect(filterVocabularyByArticle([], 'Some article content.')).toEqual([]);
  });

  it('returns empty array for empty content', () => {
    const vocab = [word('hello')];
    expect(filterVocabularyByArticle(vocab, '')).toEqual([]);
  });

  it('handles words with apostrophes', () => {
    const vocab = [word("don't"), word('can')];
    const content = "I don't think I can do that.";
    const result = filterVocabularyByArticle(vocab, content);
    expect(result.map((v) => v.word)).toEqual(["don't", 'can']);
  });

  it('handles hyphenated words', () => {
    const vocab = [word('well-known'), word('famous')];
    const content = 'This is a well-known fact.';
    const result = filterVocabularyByArticle(vocab, content);
    expect(result.map((v) => v.word)).toEqual(['well-known']);
  });

  it('does not partially match words', () => {
    const vocab = [word('cat')];
    const content = 'The catalog is on the table.';
    // 'catalog' tokenizes as 'catalog', not 'cat', so no match
    expect(filterVocabularyByArticle(vocab, content)).toEqual([]);
  });
});
