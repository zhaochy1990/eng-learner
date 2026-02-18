# English Learning Web App

A web application for Chinese-speaking professionals to improve English through article reading, listening, and vocabulary building.

## Features

- **Article Reader** - Read articles with clickable word lookup. Click any word to see its Chinese translation, phonetic transcription, and part of speech. Select phrases to get translations.
- **Listening (TTS)** - Listen to articles with browser Text-to-Speech. Sentence-level highlighting, speed control (0.5x-1.5x), and sentence/paragraph navigation.
- **Vocabulary Management** - Save words while reading. Track mastery levels (New / Learning / Familiar / Mastered). Filter, search, sort, and export vocabulary to CSV.
- **Spaced Repetition Review** - Flashcard-based review with a simplified SM-2 algorithm. Rate recall as Again/Hard/Good/Easy to schedule future reviews.
- **Article Library** - Browse, search, and filter articles by difficulty and category. Add articles by pasting text or importing URLs.
- **Dashboard** - Overview of learning stats, continue reading progress, and review reminders.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: SQLite via `better-sqlite3`
- **Dictionary**: ECDICT (770k+ English-Chinese entries)
- **TTS**: Browser Web Speech API

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Download ECDICT dictionary (770k+ English-Chinese entries, ~200MB)
bash scripts/download-ecdict.sh

# Seed the database with sample articles
npx tsx scripts/seed-articles.ts

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### ECDICT Download

The dictionary database (~800MB) is downloaded from [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT). If the automatic download script fails, you can manually:

1. Download `ecdict-sqlite-28.zip` from [ECDICT releases](https://github.com/skywind3000/ECDICT/releases/tag/1.0.28)
2. Extract `stardict.db` from the zip
3. Rename it to `ecdict.db` and place it in the `data/` directory

## Project Structure

```
src/
  app/
    page.tsx                    # Dashboard (home page)
    articles/
      page.tsx                  # Article library
      [id]/page.tsx             # Article reader
    vocabulary/
      page.tsx                  # Vocabulary list
      review/page.tsx           # Flashcard review
    api/
      articles/route.ts         # Articles CRUD
      articles/[id]/route.ts    # Single article + reading progress
      dictionary/route.ts       # ECDICT word lookup
      translate/route.ts        # Phrase translation
      vocabulary/route.ts       # Vocabulary CRUD
      vocabulary/review/route.ts # Spaced repetition review
      vocabulary/export/route.ts # CSV export
      stats/route.ts            # Dashboard stats
  components/
    nav-bar.tsx                 # Navigation bar
    article-reader.tsx          # Core reader with word interaction
    word-popover.tsx            # Dictionary popup
    tts-player.tsx              # TTS listening controls
    add-article-dialog.tsx      # Add article dialog (4 modes)
    ui/                         # shadcn/ui components
  hooks/
    use-tts.ts                  # TTS hook (Web Speech API)
  lib/
    db.ts                       # SQLite connection + operations
    dictionary.ts               # ECDICT lookup with inflection handling
    spaced-repetition.ts        # SM-2 review scheduling
    utils.ts                    # Utility functions
data/
  app.db                        # Application database (auto-created)
  ecdict.db                     # ECDICT dictionary (downloaded)
scripts/
  seed-articles.ts              # Seed sample articles
  download-ecdict.sh            # Download ECDICT database
```

## Usage

### Reading Articles

1. Go to **Articles** and click "Read" on any article
2. Click any word to see its translation in a popup
3. Select multiple words to translate phrases
4. Click "Save Word" to add words to your vocabulary
5. Click "Listen" to enable TTS playback with sentence highlighting

### Managing Vocabulary

1. Go to **Vocabulary** to see all saved words
2. Filter by mastery level, search, or sort
3. Click a word row to expand and see full details
4. Click the speaker icon to hear pronunciation
5. Export your vocabulary to CSV

### Reviewing Words

1. Go to **Review** to start a flashcard session
2. Try to recall the meaning of each word
3. Tap the card to reveal the answer
4. Rate your recall: Again / Hard / Good / Easy
5. The spaced repetition algorithm schedules future reviews

### Adding Articles

1. Click "+ Add Article" in the article library
2. Choose a method: Paste Text, Import URL, AI Generate, or Web Search
3. Fill in the title, content, difficulty, and category
4. Click "Add" to save the article
