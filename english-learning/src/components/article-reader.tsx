"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WordPopover } from "@/components/word-popover";
import { X, Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitParagraphs, splitSentences } from "@/lib/text-utils";
import type { Article } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// C5 fix: re-export Article from shared types for backward compat
export type { Article } from "@/lib/types";

interface ArticleReaderProps {
  article: Article;
  currentSentenceIndex?: number;
  onSentenceChange?: (sentenceIndex: number) => void;
  settings: ReaderSettings;
}

export type FontSize = "small" | "medium" | "large";
export type LineSpacing = "compact" | "normal" | "relaxed";

export interface ReaderSettings {
  fontSize: FontSize;
  lineSpacing: LineSpacing;
}

// L9 fix: persist settings to localStorage
const SETTINGS_KEY = "english-app-reader-settings";

export function loadSettings(): ReaderSettings {
  if (typeof window === "undefined") return { fontSize: "medium", lineSpacing: "normal" };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.fontSize && parsed.lineSpacing) return parsed;
    }
  } catch { /* ignore */ }
  return { fontSize: "medium", lineSpacing: "normal" };
}

export function saveSettings(settings: ReaderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Text tokenisation helpers
// ---------------------------------------------------------------------------

interface ParsedWord {
  text: string;
  clean: string;
  trailing: string;
}

interface ParsedSentence {
  words: ParsedWord[];
  raw: string;
  globalIndex: number;
}

interface ParsedParagraph {
  sentences: ParsedSentence[];
  raw: string;
  index: number;
}

function tokeniseWords(text: string): ParsedWord[] {
  const wordTokens = text.split(/(\s+)/);
  const words: ParsedWord[] = [];
  for (let i = 0; i < wordTokens.length; i++) {
    const token = wordTokens[i];
    if (/^\s*$/.test(token)) continue;
    const match = token.match(/^(.*?)([^a-zA-Z'-]*)$/);
    const body = match ? match[1] : token;
    const trailing = match ? match[2] : "";
    words.push({
      text: token,
      clean: body.toLowerCase().replace(/^[^a-zA-Z'-]+/, ""),
      trailing,
    });
  }
  return words;
}

// C6 fix: use shared text-utils for splitting
function tokenise(content: string): ParsedParagraph[] {
  const rawParagraphs = splitParagraphs(content);

  let sentenceCounter = 0;
  const paragraphs: ParsedParagraph[] = [];

  rawParagraphs.forEach((rawPara, paraIdx) => {
    const sentenceTexts = splitSentences(rawPara);

    const sentences: ParsedSentence[] = sentenceTexts.map((raw) => {
      const wordTokens = raw.split(/(\s+)/);
      const words: ParsedWord[] = [];

      for (let i = 0; i < wordTokens.length; i++) {
        const token = wordTokens[i];
        if (/^\s*$/.test(token)) continue;

        const match = token.match(/^(.*?)([^a-zA-Z'-]*)$/);
        const body = match ? match[1] : token;
        const trailing = match ? match[2] : "";

        words.push({
          text: token,
          clean: body.toLowerCase().replace(/^[^a-zA-Z'-]+/, ""),
          trailing,
        });
      }

      const sentence: ParsedSentence = {
        words,
        raw,
        globalIndex: sentenceCounter,
      };
      sentenceCounter++;
      return sentence;
    });

    paragraphs.push({ sentences, raw: rawPara, index: paraIdx });
  });

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Font / spacing CSS maps
// ---------------------------------------------------------------------------

const fontSizeClasses: Record<FontSize, string> = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
};

const lineSpacingClasses: Record<LineSpacing, string> = {
  compact: "leading-relaxed",
  normal: "leading-loose",
  relaxed: "leading-[2.2]",
};

// ---------------------------------------------------------------------------
// ArticleReader Component
// ---------------------------------------------------------------------------

export function ArticleReader({
  article,
  currentSentenceIndex,
  onSentenceChange,
  settings,
}: ArticleReaderProps) {
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [activeWord, setActiveWord] = useState<{
    word: string;
    position: { x: number; y: number };
    sentence: string;
  } | null>(null);

  const [selectionPopup, setSelectionPopup] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    text: string;
    translation: string;
    position: { x: number; y: number };
  } | null>(null);

  const readerRef = useRef<HTMLDivElement>(null);

  const paragraphs = useMemo(() => tokenise(article.content), [article.content]);
  const titleWords = useMemo(() => tokeniseWords(article.title), [article.title]);

  // --- fetch saved words on mount ---
  useEffect(() => {
    apiFetch("/api/vocabulary")
      .then((res) => res.json())
      .then((data: { word: string }[]) => {
        const words = new Set(
          (Array.isArray(data) ? data : []).map((w) => w.word.toLowerCase())
        );
        setSavedWords(words);
      })
      .catch((err) => {
        // C2 fix: log instead of silent swallow
        console.error("Failed to fetch saved words:", err);
      });
  }, []);

  // --- handle text selection for translate ---
  useEffect(() => {
    function handleMouseUp() {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          return;
        }

        const text = selection.toString().trim();
        if (!text || text.split(/\s+/).length < 2) {
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectionPopup({
          text,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.bottom,
          },
        });
        setTranslationResult(null);
      }, 10);
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-translate-popup]")) {
        setSelectionPopup(null);
        setTranslationResult(null);
      }
    }

    const reader = readerRef.current;
    if (reader) {
      reader.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousedown", handleMouseDown);
      return () => {
        reader.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mousedown", handleMouseDown);
      };
    }
  }, []);

  const handleWordClick = useCallback(
    (
      e: React.MouseEvent<HTMLSpanElement>,
      wordText: string,
      sentenceText: string
    ) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setActiveWord({
        word: wordText,
        position: { x: rect.left + rect.width / 2, y: rect.bottom },
        sentence: sentenceText,
      });
      setSelectionPopup(null);
      setTranslationResult(null);
    },
    []
  );

  const handleTranslate = useCallback(async () => {
    if (!selectionPopup) return;

    setTranslating(true);
    try {
      const res = await apiFetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectionPopup.text }),
      });

      if (res.ok) {
        const data = await res.json();
        setTranslationResult({
          text: selectionPopup.text,
          translation: data.translation,
          position: selectionPopup.position,
        });
      }
    } catch (err) {
      // C2 fix: log instead of silent swallow
      console.error("Translation failed:", err);
    } finally {
      setTranslating(false);
      setSelectionPopup(null);
    }
  }, [selectionPopup]);

  const handleWordSaved = useCallback((word: string) => {
    setSavedWords((prev) => {
      const next = new Set(prev);
      next.add(word.toLowerCase());
      return next;
    });
  }, []);

  const handleSentenceClick = useCallback(
    (sentenceIndex: number) => {
      onSentenceChange?.(sentenceIndex);
    },
    [onSentenceChange]
  );

  const isWordSaved = useCallback(
    (clean: string) => savedWords.has(clean),
    [savedWords]
  );

  return (
    <div className="relative">
      {/* Article title */}
      <h1 className="text-2xl font-bold tracking-tight mb-3">
        {titleWords.map((word, wordIdx) => {
          const isSaved = word.clean && isWordSaved(word.clean);
          const isClickable = /[a-zA-Z]/.test(word.clean);
          return (
            <span key={wordIdx}>
              {isClickable ? (
                <span
                  className={cn(
                    "cursor-pointer rounded-sm transition-colors hover:bg-primary/10",
                    isSaved &&
                      "underline decoration-primary/40 decoration-2 underline-offset-4"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWordClick(e, word.text, article.title);
                  }}
                >
                  {word.text}
                </span>
              ) : (
                <span>{word.text}</span>
              )}
              {wordIdx < titleWords.length - 1 && " "}
            </span>
          );
        })}
      </h1>

      {/* Article content */}
      <div
        ref={readerRef}
        className={cn(
          "prose prose-neutral dark:prose-invert max-w-none select-text",
          fontSizeClasses[settings.fontSize],
          lineSpacingClasses[settings.lineSpacing]
        )}
      >
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph.index}
            data-paragraph-index={paragraph.index}
            className="mb-6"
          >
            {paragraph.sentences.map((sentence) => (
              <span
                key={sentence.globalIndex}
                data-sentence-index={sentence.globalIndex}
                className={cn(
                  "transition-colors duration-200",
                  currentSentenceIndex === sentence.globalIndex &&
                    "bg-primary/10 rounded px-0.5 -mx-0.5"
                )}
                onClick={() => handleSentenceClick(sentence.globalIndex)}
              >
                {sentence.words.map((word, wordIdx) => {
                  const isSaved = word.clean && isWordSaved(word.clean);
                  const isClickable = /[a-zA-Z]/.test(word.clean);

                  return (
                    <span key={wordIdx}>
                      {isClickable ? (
                        <span
                          className={cn(
                            "cursor-pointer rounded-sm transition-colors hover:bg-primary/10",
                            isSaved &&
                              "underline decoration-primary/40 decoration-2 underline-offset-4"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(e, word.text, sentence.raw);
                          }}
                        >
                          {word.text}
                        </span>
                      ) : (
                        <span>{word.text}</span>
                      )}
                      {wordIdx < sentence.words.length - 1 && " "}
                    </span>
                  );
                })}
              </span>
            ))}
          </p>
        ))}
      </div>

      {/* Word popover */}
      {activeWord && (
        <WordPopover
          word={activeWord.word}
          position={activeWord.position}
          onClose={() => setActiveWord(null)}
          onSave={handleWordSaved}
          articleId={article.id}
          contextSentence={activeWord.sentence}
        />
      )}

      {/* Selection translate button */}
      {selectionPopup && !translationResult && (
        <div
          data-translate-popup
          className="fixed z-[100] animate-in fade-in-0 zoom-in-95"
          style={{
            left: `${selectionPopup.position.x}px`,
            top: `${selectionPopup.position.y + 8}px`,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant="default"
            className="shadow-lg gap-1.5"
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Languages className="h-3.5 w-3.5" />
            )}
            Translate
          </Button>
        </div>
      )}

      {/* Translation result popup */}
      {translationResult && (
        <div
          data-translate-popup
          className="fixed z-[100] w-80 rounded-lg border bg-popover p-3 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{
            left: `${Math.min(
              translationResult.position.x,
              typeof window !== "undefined"
                ? window.innerWidth - 340
                : translationResult.position.x
            )}px`,
            top: `${translationResult.position.y + 8}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Translation
            </p>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setTranslationResult(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Separator className="mb-2" />
          <p className="text-sm italic text-muted-foreground mb-1.5 line-clamp-2">
            &ldquo;{translationResult.text}&rdquo;
          </p>
          <p className="text-sm font-medium">{translationResult.translation}</p>
        </div>
      )}
    </div>
  );
}
