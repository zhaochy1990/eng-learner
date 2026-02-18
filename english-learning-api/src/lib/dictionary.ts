import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const ECDICT_PATH = path.join(__dirname, '..', '..', 'data', 'ecdict.db');

let dictDb: Database.Database | null = null;

export interface DictEntry {
  word: string;
  phonetic: string | null;
  definition: string | null;
  translation: string | null;
  pos: string | null;
  exchange: string | null;
  tag: string | null;
  frq: number | null;
}

export function getDictDb(): Database.Database | null {
  if (!dictDb) {
    if (!fs.existsSync(ECDICT_PATH)) {
      console.warn('ECDICT database not found at', ECDICT_PATH);
      return null;
    }
    dictDb = new Database(ECDICT_PATH, { readonly: true });
  }
  return dictDb;
}

const INFLECTION_RULES: [RegExp, string[]][] = [
  [/ies$/i, ['y']],
  [/ves$/i, ['fe', 'f']],
  [/ses$/i, ['se', 's', '']],
  [/es$/i, ['e', '']],
  [/s$/i, ['']],
  [/ied$/i, ['y']],
  [/ed$/i, ['e', '']],
  [/ing$/i, ['e', '', 'ing']],
  [/er$/i, ['e', '']],
  [/est$/i, ['e', '']],
  [/ly$/i, ['', 'le']],
  [/ness$/i, ['']],
  [/ment$/i, ['']],
  [/tion$/i, ['te', 't']],
];

function getBaseForms(word: string): string[] {
  const forms = [word];
  const lower = word.toLowerCase();
  if (lower !== word) forms.push(lower);

  for (const [pattern, replacements] of INFLECTION_RULES) {
    if (pattern.test(lower)) {
      for (const replacement of replacements) {
        const base = lower.replace(pattern, replacement);
        if (base && base !== lower && base.length >= 2) {
          forms.push(base);
        }
      }
    }
  }

  return [...new Set(forms)];
}

export function lookupWord(word: string): DictEntry | null {
  const db = getDictDb();
  if (!db) return null;

  const cleanWord = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!cleanWord) return null;

  const direct = db.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get(cleanWord) as DictEntry | undefined;
  if (direct) return direct;

  const baseForms = getBaseForms(cleanWord);
  for (const form of baseForms) {
    if (form === cleanWord) continue;
    const entry = db.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get(form) as DictEntry | undefined;
    if (entry) return entry;
  }

  if (/(.)\1(ing|ed)$/i.test(cleanWord)) {
    const base = cleanWord.replace(/(.)\1(ing|ed)$/i, '$1');
    const entry = db.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get(base) as DictEntry | undefined;
    if (entry) return entry;
  }

  return null;
}

export function lookupMultiple(words: string[]): Record<string, DictEntry | null> {
  const result: Record<string, DictEntry | null> = {};
  for (const word of words) {
    result[word] = lookupWord(word);
  }
  return result;
}
