"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Volume2, BookmarkPlus, BookmarkCheck, X, Loader2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { apiUrl } from "@/lib/api";

interface DictEntry {
  word: string;
  phonetic: string | null;
  definition: string | null;
  translation: string | null;
  pos: string | null;
  exchange: string | null;
  tag: string | null;
  frq: number | null;
}

interface WordPopoverProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (word: string) => void;
  articleId: number;
  contextSentence: string;
}

export function WordPopover({
  word,
  position,
  onClose,
  onSave,
  articleId,
  contextSentence,
}: WordPopoverProps) {
  const [dictEntry, setDictEntry] = useState<DictEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Clean the word: remove punctuation from edges
  const cleanWord = word.replace(/^[^a-zA-Z'-]+|[^a-zA-Z'-]+$/g, "").toLowerCase();

  // Fetch dictionary data
  useEffect(() => {
    if (!cleanWord) {
      setLoading(false);
      setError("Invalid word");
      return;
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/dictionary?word=${encodeURIComponent(cleanWord)}`))
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Word not found in dictionary");
          throw new Error("Failed to look up word");
        }
        return res.json();
      })
      .then((data: DictEntry) => {
        setDictEntry(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cleanWord]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    // Close on escape
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    // Delay adding the listener so the click that opened the popover doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // C3 fix: use shared speak utility
  const speakWord = useCallback(() => {
    speak(cleanWord);
  }, [cleanWord]);

  // Save word to vocabulary
  const handleSave = async () => {
    if (!dictEntry || saved) return;

    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/vocabulary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: dictEntry.word,
          phonetic: dictEntry.phonetic,
          translation: dictEntry.translation || "No translation available",
          pos: dictEntry.pos,
          definition: dictEntry.definition,
          context_sentence: contextSentence,
          context_article_id: articleId,
        }),
      });

      if (res.ok) {
        setSaved(true);
        onSave(dictEntry.word);
      }
    } catch (err) {
      // C2 fix: log instead of silent swallow
      console.error("Failed to save word:", err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate popover position to keep it on screen
  const popoverStyle = (() => {
    const popoverWidth = 320;
    const popoverMaxHeight = 400;
    const margin = 12;

    let left = position.x - popoverWidth / 2;
    let top = position.y + 8;

    // Keep within horizontal bounds
    if (left < margin) left = margin;
    if (typeof window !== "undefined" && left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }

    // If it would overflow below, show above the word instead
    if (
      typeof window !== "undefined" &&
      top + popoverMaxHeight > window.innerHeight - margin
    ) {
      top = position.y - popoverMaxHeight - 8;
      if (top < margin) top = margin;
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${popoverWidth}px`,
    };
  })();

  // Parse the exchange field for base form info
  const parseExchange = (
    exchange: string | null
  ): { type: string; form: string }[] => {
    if (!exchange) return [];
    const typeLabels: Record<string, string> = {
      p: "past tense",
      d: "past participle",
      i: "present participle",
      "3": "3rd person singular",
      r: "comparative",
      t: "superlative",
      s: "plural",
      "0": "base form",
      "1": "base form",
    };
    const results: { type: string; form: string }[] = [];
    for (const part of exchange.split("/")) {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) continue;
      const type = part.substring(0, colonIdx);
      const form = part.substring(colonIdx + 1);
      if (type && form && typeLabels[type]) {
        results.push({ type: typeLabels[type], form });
      }
    }
    return results;
  };

  // Format POS display
  const formatPos = (pos: string | null): string[] => {
    if (!pos) return [];
    // POS from ECDICT looks like "n/v/adj" or just "n"
    return pos
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
  };

  // Determine if the looked-up word differs from the search word (inflected form)
  const isInflected =
    dictEntry && dictEntry.word.toLowerCase() !== cleanWord;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={popoverStyle}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Looking up...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : dictEntry ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold leading-tight">
                  {dictEntry.word}
                </h3>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={speakWord}
                  title="Pronounce"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {dictEntry.phonetic && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  /{dictEntry.phonetic}/
                </p>
              )}
              {isInflected && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="italic">{cleanWord}</span> is a form of{" "}
                  <span className="font-medium">{dictEntry.word}</span>
                </p>
              )}
            </>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 -mt-0.5 -mr-1"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {dictEntry && !loading && !error && (
        <>
          <Separator />

          {/* Body */}
          <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
            {/* Part of speech */}
            {formatPos(dictEntry.pos).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formatPos(dictEntry.pos).map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            )}

            {/* Chinese translation */}
            {dictEntry.translation && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Translation
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {dictEntry.translation}
                </p>
              </div>
            )}

            {/* English definition */}
            {dictEntry.definition && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Definition
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {dictEntry.definition}
                </p>
              </div>
            )}

            {/* Exchange / inflections info */}
            {dictEntry.exchange && parseExchange(dictEntry.exchange).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Word Forms
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {parseExchange(dictEntry.exchange).map((ex, i) => (
                    <span key={i} className="text-xs text-muted-foreground">
                      <span className="italic">{ex.type}:</span>{" "}
                      <span className="font-medium text-foreground">
                        {ex.form}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Footer - Save button */}
          <div className="p-3 pt-2">
            {saved ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled
              >
                <BookmarkCheck className="h-4 w-4 mr-1.5" />
                Already Saved
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4 mr-1.5" />
                )}
                Save Word
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
