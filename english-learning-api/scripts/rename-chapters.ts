/**
 * Rename book chapters from Roman numerals to Arabic numbers via the API.
 *
 * Usage:
 *   npx tsx scripts/rename-chapters.ts <API_URL> <ACCESS_TOKEN>
 *
 * Example:
 *   npx tsx scripts/rename-chapters.ts https://your-api.example.com "eyJhbG..."
 */

const API_URL = process.argv[2];
const TOKEN = process.argv[3];

if (!API_URL || !TOKEN) {
  console.error('Usage: npx tsx scripts/rename-chapters.ts <API_URL> <ACCESS_TOKEN>');
  process.exit(1);
}

const ROMAN_TO_ARABIC: Record<string, number> = {};
const romans = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
  'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L',
  'LI', 'LII', 'LIII', 'LIV', 'LV', 'LVI', 'LVII', 'LVIII', 'LIX', 'LX', 'LXI',
];
for (let i = 1; i < romans.length; i++) {
  ROMAN_TO_ARABIC[romans[i]] = i;
}

// Match titles like "Book Title - Chapter XIV"
const CHAPTER_RE = /^(.+) - Chapter ([IVXLC]+)$/;

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const articles = await apiFetch('/api/articles') as { id: number; title: string }[];

  const toRename = articles.filter((a) => CHAPTER_RE.test(a.title));
  console.log(`Found ${toRename.length} chapters to rename.\n`);

  let renamed = 0;
  for (const article of toRename) {
    const match = article.title.match(CHAPTER_RE)!;
    const bookTitle = match[1];
    const roman = match[2];
    const arabic = ROMAN_TO_ARABIC[roman];

    if (arabic === undefined) {
      console.log(`  SKIP: ${article.title} (unknown numeral "${roman}")`);
      continue;
    }

    const newTitle = `${bookTitle} - Chapter ${arabic}`;
    await apiFetch(`/api/articles/${article.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: newTitle }),
    });
    renamed++;
    console.log(`  [${renamed}] id=${article.id}: "${article.title}" -> "${newTitle}"`);
  }

  console.log(`\nDone! Renamed ${renamed} chapters.`);
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
