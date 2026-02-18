import { describe, it, expect } from 'vitest';
import { calculateNextReview, getMasteryLabel, getMasteryStars } from './spaced-repetition';

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

describe('calculateNextReview', () => {
  describe('rating: again', () => {
    it.each([0, 1, 2, 3])('resets to level 0 from level %i', (level) => {
      const { newLevel, nextReviewAt } = calculateNextReview(level, 'again');
      expect(newLevel).toBe(0);
      expect(nextReviewAt).toMatch(DATETIME_RE);
      // Should be ~10 minutes from now, so still today or very near
      const reviewDate = new Date(nextReviewAt.replace(' ', 'T') + 'Z');
      expect(reviewDate.getTime()).toBeGreaterThan(Date.now());
      // Should be less than 15 minutes from now
      expect(reviewDate.getTime() - Date.now()).toBeLessThan(15 * 60 * 1000);
    });
  });

  describe('rating: hard', () => {
    it.each([0, 1, 2, 3])('keeps level %i unchanged', (level) => {
      const { newLevel, nextReviewAt } = calculateNextReview(level, 'hard');
      expect(newLevel).toBe(level);
      expect(nextReviewAt).toMatch(DATETIME_RE);
      const reviewDate = new Date(nextReviewAt.replace(' ', 'T') + 'Z');
      expect(reviewDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rating: good', () => {
    const cases: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 3], // capped at 3
    ];

    it.each(cases)('from level %i increments to level %i', (current, expected) => {
      const { newLevel, nextReviewAt } = calculateNextReview(current, 'good');
      expect(newLevel).toBe(expected);
      expect(nextReviewAt).toMatch(DATETIME_RE);
      const reviewDate = new Date(nextReviewAt.replace(' ', 'T') + 'Z');
      expect(reviewDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rating: easy', () => {
    const cases: [number, number][] = [
      [0, 2],
      [1, 3],
      [2, 3], // capped at 3
      [3, 3], // capped at 3
    ];

    it.each(cases)('from level %i increments to level %i', (current, expected) => {
      const { newLevel, nextReviewAt } = calculateNextReview(current, 'easy');
      expect(newLevel).toBe(expected);
      expect(nextReviewAt).toMatch(DATETIME_RE);
      const reviewDate = new Date(nextReviewAt.replace(' ', 'T') + 'Z');
      expect(reviewDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

describe('getMasteryLabel', () => {
  it.each([
    [0, 'New'],
    [1, 'Learning'],
    [2, 'Familiar'],
    [3, 'Mastered'],
  ])('level %i returns "%s"', (level, label) => {
    expect(getMasteryLabel(level)).toBe(label);
  });

  it('returns "Unknown" for an unmapped level', () => {
    expect(getMasteryLabel(99)).toBe('Unknown');
  });
});

describe('getMasteryStars', () => {
  it.each([
    [0, '☆☆☆'],
    [1, '★☆☆'],
    [2, '★★☆'],
    [3, '★★★'],
  ])('level %i returns "%s"', (level, stars) => {
    expect(getMasteryStars(level)).toBe(stars);
  });
});
