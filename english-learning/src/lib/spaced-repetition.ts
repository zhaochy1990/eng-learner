// Display-only constants for the frontend (algorithm logic lives in the API server)

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const MASTERY_LABELS: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Familiar',
  3: 'Mastered',
};
