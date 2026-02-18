"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArticleReader } from "@/components/article-reader";
import { TTSPlayer } from "@/components/tts-player";
import { useTTS } from "@/hooks/use-tts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Article } from "@/lib/types";
import { apiUrl } from "@/lib/api";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Loader2,
  AudioLines,
} from "lucide-react";

export default function ArticleReaderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | undefined>(undefined);
  const [showTTS, setShowTTS] = useState(false);

  // Scroll-progress saving timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedScrollRef = useRef<number>(0);
  // H3 fix: guard to prevent unbounded completion PATCH requests
  const completedRef = useRef(false);

  // --- Fetch article data ---
  useEffect(() => {
    if (!params.id) return;

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/articles/${params.id}`))
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Article not found");
          throw new Error("Failed to load article");
        }
        return res.json();
      })
      .then((data) => {
        setArticle(data);
        if (data.completed === 1) {
          completedRef.current = true;
        }
        // Restore scroll position if saved
        if (data.scroll_position && data.scroll_position > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: data.scroll_position,
              behavior: "instant",
            });
          });
        }
        if (data.current_sentence !== undefined && data.current_sentence > 0) {
          setCurrentSentenceIndex(data.current_sentence);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id]);

  // --- Save reading progress periodically on scroll ---
  const saveProgress = useCallback(
    (scrollPos: number) => {
      if (!params.id) return;

      fetch(apiUrl(`/api/articles/${params.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scroll_position: scrollPos,
          current_sentence: currentSentenceIndex ?? 0,
        }),
      }).catch((err) => {
        // C2 fix: log errors instead of silently swallowing
        console.error("Failed to save reading progress:", err);
      });
    },
    [params.id, currentSentenceIndex]
  );

  useEffect(() => {
    function handleScroll() {
      const scrollPos = window.scrollY;

      if (Math.abs(scrollPos - lastSavedScrollRef.current) < 100) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        lastSavedScrollRef.current = scrollPos;
        saveProgress(scrollPos);
      }, 2000);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [saveProgress]);

  // H2 fix: use fetch with keepalive instead of sendBeacon to preserve PATCH method
  useEffect(() => {
    return () => {
      if (params.id) {
        const scrollPos = window.scrollY;
        const data = JSON.stringify({
          scroll_position: scrollPos,
          current_sentence: currentSentenceIndex ?? 0,
        });
        fetch(apiUrl(`/api/articles/${params.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // H3 fix: mark complete only once, with a guard ref
  useEffect(() => {
    function handleScroll() {
      if (!params.id || completedRef.current) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        completedRef.current = true;
        fetch(apiUrl(`/api/articles/${params.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        }).catch((err) => {
          console.error("Failed to mark article complete:", err);
          completedRef.current = false; // Allow retry on failure
        });
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [params.id]);

  // --- TTS hook ---
  const tts = useTTS({
    text: article?.content || "",
    onSentenceChange: (idx) => setCurrentSentenceIndex(idx),
  });

  // M9 fix: use tts.jumpToSentence directly instead of the whole tts object
  const jumpToSentenceRef = useRef(tts.jumpToSentence);
  jumpToSentenceRef.current = tts.jumpToSentence;

  const handleSentenceChange = useCallback((sentenceIndex: number) => {
    setCurrentSentenceIndex(sentenceIndex);
    jumpToSentenceRef.current(sentenceIndex);
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error || !article) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {error || "Article not found"}
            </h2>
            <p className="text-sm text-muted-foreground">
              The article you are looking for could not be loaded.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/articles")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  // --- Article loaded ---
  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/articles")}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant={showTTS ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowTTS((v) => !v)}
          >
            <AudioLines className="h-4 w-4" />
            {showTTS ? "Hide Player" : "Listen"}
          </Button>
        </div>
      </div>

      {/* Article metadata */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {article.difficulty && (
            <Badge variant="outline" className="capitalize">
              {article.difficulty}
            </Badge>
          )}
          {article.category && (
            <Badge variant="secondary" className="capitalize">
              {article.category}
            </Badge>
          )}
          {article.word_count != null && article.word_count > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {article.word_count} words
            </span>
          )}
          {article.reading_time != null && article.reading_time > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time} min read
            </span>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Article reader */}
      <ArticleReader
        article={article}
        currentSentenceIndex={currentSentenceIndex}
        onSentenceChange={handleSentenceChange}
      />

      {/* TTS Player */}
      {showTTS && <TTSPlayer {...tts} />}
    </div>
  );
}
