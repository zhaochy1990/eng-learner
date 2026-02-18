export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const MASTERY_LABELS: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Familiar',
  3: 'Mastered',
};

const GOOD_INTERVALS: Record<number, number> = {
  0: 1,
  1: 3,
  2: 7,
  3: 14,
};

const EASY_INTERVALS: Record<number, number> = {
  0: 3,
  1: 7,
  2: 14,
  3: 30,
};

export function calculateNextReview(
  currentLevel: number,
  rating: Rating
): { newLevel: number; nextReviewAt: string } {
  let newLevel: number;
  let intervalDays: number;

  switch (rating) {
    case 'again':
      newLevel = 0;
      intervalDays = 0;
      break;
    case 'hard':
      newLevel = currentLevel;
      intervalDays = 1;
      break;
    case 'good':
      newLevel = Math.min(3, currentLevel + 1);
      intervalDays = GOOD_INTERVALS[currentLevel] || 1;
      break;
    case 'easy':
      newLevel = Math.min(3, currentLevel + 2);
      intervalDays = EASY_INTERVALS[currentLevel] || 3;
      break;
  }

  const now = new Date();
  if (intervalDays === 0) {
    now.setUTCMinutes(now.getUTCMinutes() + 10);
  } else {
    now.setUTCDate(now.getUTCDate() + intervalDays);
    now.setUTCHours(0, 0, 0, 0);
  }

  return {
    newLevel,
    nextReviewAt: now.toISOString().replace('T', ' ').substring(0, 19),
  };
}

export function getMasteryLabel(level: number): string {
  return MASTERY_LABELS[level] || 'Unknown';
}

export function getMasteryStars(level: number): string {
  return '★'.repeat(level) + '☆'.repeat(3 - level);
}
