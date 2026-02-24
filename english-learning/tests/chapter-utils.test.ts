import { describe, it, expect } from 'vitest';
import { parseChapters } from '../src/lib/chapter-utils';

describe('parseChapters', () => {
  it('returns empty array for empty content', () => {
    expect(parseChapters('')).toEqual([]);
  });

  it('returns empty array when no ## headings exist', () => {
    const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    expect(parseChapters(content)).toEqual([]);
  });

  it('does not match ### headings', () => {
    const content = '### Not a chapter\n\nSome text.';
    expect(parseChapters(content)).toEqual([]);
  });

  it('does not match # headings', () => {
    const content = '# Title heading\n\nSome text.';
    expect(parseChapters(content)).toEqual([]);
  });

  it('detects a single ## heading', () => {
    const content = '## Chapter One\n\nSome text here.';
    expect(parseChapters(content)).toEqual([
      { title: 'Chapter One', paragraphIndex: 0 },
    ]);
  });

  it('detects multiple ## headings with correct paragraph indices', () => {
    const content = 'Intro paragraph.\n\n## Chapter 1\n\nText of chapter 1.\n\n## Chapter 2\n\nText of chapter 2.';
    expect(parseChapters(content)).toEqual([
      { title: 'Chapter 1', paragraphIndex: 1 },
      { title: 'Chapter 2', paragraphIndex: 3 },
    ]);
  });

  it('handles heading as first paragraph', () => {
    const content = '## Prologue\n\nSome prologue text.\n\n## Chapter 1\n\nChapter text.';
    expect(parseChapters(content)).toEqual([
      { title: 'Prologue', paragraphIndex: 0 },
      { title: 'Chapter 1', paragraphIndex: 2 },
    ]);
  });

  it('handles heading as last paragraph', () => {
    const content = 'Some text.\n\n## Epilogue';
    expect(parseChapters(content)).toEqual([
      { title: 'Epilogue', paragraphIndex: 1 },
    ]);
  });

  it('trims whitespace from chapter titles', () => {
    const content = '##   Spaced Title  \n\nText.';
    expect(parseChapters(content)).toEqual([
      { title: 'Spaced Title', paragraphIndex: 0 },
    ]);
  });

  it('skips empty paragraphs between headings', () => {
    const content = '## Ch 1\n\n\n\n## Ch 2';
    expect(parseChapters(content)).toEqual([
      { title: 'Ch 1', paragraphIndex: 0 },
      { title: 'Ch 2', paragraphIndex: 1 },
    ]);
  });
});
