import { describe, it, expect } from 'vitest';
import { MASTERY_LABELS } from './spaced-repetition';

describe('MASTERY_LABELS', () => {
  it('has entries for levels 0, 1, 2, 3', () => {
    expect(MASTERY_LABELS).toHaveProperty('0');
    expect(MASTERY_LABELS).toHaveProperty('1');
    expect(MASTERY_LABELS).toHaveProperty('2');
    expect(MASTERY_LABELS).toHaveProperty('3');
  });

  it('maps 0 to New', () => {
    expect(MASTERY_LABELS[0]).toBe('New');
  });

  it('maps 1 to Learning', () => {
    expect(MASTERY_LABELS[1]).toBe('Learning');
  });

  it('maps 2 to Familiar', () => {
    expect(MASTERY_LABELS[2]).toBe('Familiar');
  });

  it('maps 3 to Mastered', () => {
    expect(MASTERY_LABELS[3]).toBe('Mastered');
  });
});
