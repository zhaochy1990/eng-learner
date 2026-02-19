"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, RotateCcw, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { speak } from "@/lib/speech";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types (C5 fix: use shared VocabularyItem where applicable)
// ---------------------------------------------------------------------------

interface VocabularyWord {
  id: number;
  word: string;
  phonetic: string | null;
  translation: string;
  pos: string | null;
  definition: string | null;
  context_sentence: string | null;
  mastery_level: number;
}

type Rating = "again" | "hard" | "good" | "easy";
type ReviewMode = "due" | "new" | "all";

interface RatingStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

// ---------------------------------------------------------------------------
// Helpers (C3 fix: speak imported from shared module)
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<ReviewMode, string> = {
  due: "Due Words",
  new: "New Words",
  all: "All Words",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VocabularyReviewPage() {
  // ---- Data state ----------------------------------------------------------
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>("due");

  // ---- Review state --------------------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Fetch words ---------------------------------------------------------
  const fetchWords = useCallback(async (reviewMode: ReviewMode) => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setFinished(false);
    setRatingStats({ again: 0, hard: 0, good: 0, easy: 0 });

    try {
      const res = await apiFetch(`/api/vocabulary/review?mode=${reviewMode}`);
      if (!res.ok) throw new Error("Failed to fetch review words");
      const data: VocabularyWord[] = await res.json();
      setWords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords(mode);
  }, [mode, fetchWords]);

  // ---- Derived values ------------------------------------------------------
  const totalWords = words.length;
  const currentWord = words[currentIndex] ?? null;
  const progressPercent =
    totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;
  const finishedPercent = 100;
  const totalReviewed =
    ratingStats.again + ratingStats.hard + ratingStats.good + ratingStats.easy;

  // ---- Handlers ------------------------------------------------------------

  function handleFlip() {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  }

  async function handleRate(rating: Rating) {
    if (!currentWord || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await apiFetch("/api/vocabulary/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: currentWord.id,
          rating,
          currentLevel: currentWord.mastery_level,
        }),
      });

      setRatingStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      if (currentIndex + 1 >= totalWords) {
        setFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      }
    } catch {
      // Silently continue -- the review UX shouldn't break from a network blip
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleModeChange(newMode: ReviewMode) {
    setMode(newMode);
  }

  function handleReviewAgain() {
    fetchWords(mode);
  }

  // ---- Render helpers ------------------------------------------------------

  function renderModeSelector() {
    return (
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(MODE_LABELS) as ReviewMode[]).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange(m)}
          >
            {MODE_LABELS[m]}
          </Button>
        ))}
      </div>
    );
  }

  // ---- Loading / Error / Empty states --------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => fetchWords(mode)} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalWords === 0 && !finished) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Review Session</h1>
          {renderModeSelector()}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                No words due for review. Great job!
              </h2>
              <p className="mt-2 text-muted-foreground">
                Come back later or try a different review mode.
              </p>
            </div>
            <Link href="/vocabulary">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vocabulary
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Finished screen -----------------------------------------------------

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-8 py-16">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <div className="text-center">
              <h2 className="text-2xl font-bold">Review Complete!</h2>
              <p className="mt-2 text-muted-foreground">
                Words reviewed: {totalReviewed}
              </p>
            </div>

            {/* Progress bar at 100% */}
            <div className="w-full max-w-md">
              <Progress value={finishedPercent} className="h-3" />
            </div>

            {/* Accuracy breakdown */}
            <div className="grid w-full max-w-sm grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium text-red-600">Again</span>
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  {ratingStats.again}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium text-orange-600">
                  Hard
                </span>
                <Badge
                  variant="outline"
                  className="border-orange-200 bg-orange-50 text-orange-700"
                >
                  {ratingStats.hard}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium text-blue-600">Good</span>
                <Badge
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700"
                >
                  {ratingStats.good}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium text-green-600">
                  Easy
                </span>
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  {ratingStats.easy}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link href="/vocabulary">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Vocabulary
                </Button>
              </Link>
              <Button onClick={handleReviewAgain}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Review Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Flashcard screen ----------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Header: title + mode selector */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Review Session</h1>
        {renderModeSelector()}
      </div>

      {/* Progress bar + counter */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>
            {currentIndex + 1} / {totalWords} words
          </span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Flashcard */}
      <div className="perspective-[1000px] mb-8">
        <div
          className={`relative mx-auto w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
          style={{ minHeight: 320 }}
          onClick={handleFlip}
        >
          {/* ---- Front face ---- */}
          <Card
            className={`absolute inset-0 flex items-center justify-center [backface-visibility:hidden] ${
              isFlipped ? "pointer-events-none" : ""
            }`}
          >
            <CardContent className="flex w-full flex-col items-center gap-4 py-12">
              <span className="text-3xl font-bold tracking-tight">
                {currentWord?.word}
              </span>

              {currentWord?.phonetic && (
                <span className="text-lg text-muted-foreground">
                  {currentWord.phonetic}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentWord) speak(currentWord.word);
                }}
                aria-label="Play pronunciation"
              >
                <Volume2 className="h-5 w-5" />
              </Button>

              <p className="mt-4 text-sm text-muted-foreground">
                (tap to reveal)
              </p>
            </CardContent>
          </Card>

          {/* ---- Back face ---- */}
          <Card
            className={`absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              !isFlipped ? "pointer-events-none" : ""
            }`}
          >
            <CardContent className="flex w-full flex-col items-center gap-3 py-8">
              <span className="text-2xl font-bold tracking-tight">
                {currentWord?.word}
              </span>

              {currentWord?.phonetic && (
                <span className="text-base text-muted-foreground">
                  {currentWord.phonetic}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentWord) speak(currentWord.word);
                }}
                aria-label="Play pronunciation"
              >
                <Volume2 className="h-5 w-5" />
              </Button>

              <div className="my-2 h-px w-3/4 bg-border" />

              {/* Translation with part of speech */}
              <div className="text-center">
                {currentWord?.pos && (
                  <Badge variant="secondary" className="mb-2">
                    {currentWord.pos}
                  </Badge>
                )}
                <p className="text-lg font-medium">{currentWord?.translation}</p>
              </div>

              {/* English definition */}
              {currentWord?.definition && (
                <p className="max-w-sm text-center text-sm text-muted-foreground">
                  {currentWord.definition}
                </p>
              )}

              {/* Context sentence */}
              {currentWord?.context_sentence && (
                <p className="max-w-sm text-center text-sm italic text-muted-foreground">
                  &ldquo;{currentWord.context_sentence}&rdquo;
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating buttons -- only visible when flipped */}
      <div
        className={`flex justify-center gap-3 transition-opacity duration-300 ${
          isFlipped ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Button
          size="lg"
          className="min-w-[80px] bg-red-600 text-white hover:bg-red-700"
          onClick={() => handleRate("again")}
          disabled={isSubmitting}
        >
          Again
        </Button>
        <Button
          size="lg"
          className="min-w-[80px] bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => handleRate("hard")}
          disabled={isSubmitting}
        >
          Hard
        </Button>
        <Button
          size="lg"
          className="min-w-[80px] bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => handleRate("good")}
          disabled={isSubmitting}
        >
          Good
        </Button>
        <Button
          size="lg"
          className="min-w-[80px] bg-green-600 text-white hover:bg-green-700"
          onClick={() => handleRate("easy")}
          disabled={isSubmitting}
        >
          Easy
        </Button>
      </div>
    </div>
  );
}
