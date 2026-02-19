"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Volume2,
  Trash2,
  Download,
  ArrowUpDown,
  Star,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { speak } from "@/lib/speech";
import { MASTERY_LABELS } from "@/lib/spaced-repetition";
import type { VocabularyItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Constants (C4 fix: MASTERY_LABELS imported from shared module)
// ---------------------------------------------------------------------------

const MASTERY_BADGE_VARIANT: Record<number, "default" | "secondary" | "outline" | "destructive"> = {
  0: "outline",
  1: "secondary",
  2: "default",
  3: "default",
};

const MASTERY_BADGE_CLASS: Record<number, string> = {
  0: "border-muted-foreground text-muted-foreground",
  1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  3: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const MASTERY_FILTERS = [
  { label: "All", value: -1 },
  { label: "New", value: 0 },
  { label: "Learning", value: 1 },
  { label: "Familiar", value: 2 },
  { label: "Mastered", value: 3 },
] as const;

const SORT_OPTIONS = [
  { label: "Date Added", value: "date" },
  { label: "A-Z", value: "alpha" },
  { label: "Mastery", value: "mastery" },
] as const;

// ---------------------------------------------------------------------------
// Helpers (L8 fix: getMasteryStars imported; C3 fix: speak imported)
// ---------------------------------------------------------------------------

function getMasteryStars(level: number): string {
  return "\u2605".repeat(level) + "\u2606".repeat(3 - level);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\u2026";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VocabularyPage() {
  // Data
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [masteryFilter, setMasteryFilter] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Debounce search input
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch vocabulary data
  const fetchVocabulary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (masteryFilter >= 0) params.set("mastery_level", String(masteryFilter));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sortBy) params.set("sort", sortBy);

      const res = await apiFetch(`/api/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch vocabulary (${res.status})`);
      const data: VocabularyItem[] = await res.json();
      setVocabulary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [masteryFilter, debouncedSearch, sortBy]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [vocabulary]);

  // ---------------------------------------------------------------------------
  // Selection handlers
  // ---------------------------------------------------------------------------

  const allSelected =
    vocabulary.length > 0 && selectedIds.size === vocabulary.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vocabulary.map((v) => v.id)));
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} word${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await apiFetch("/api/vocabulary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to delete words");
      await fetchVocabulary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          My Vocabulary{" "}
          <span className="text-muted-foreground font-normal text-lg">
            ({vocabulary.length} word{vocabulary.length !== 1 ? "s" : ""})
          </span>
        </h1>
        <Button variant="outline" size="sm" onClick={async () => {
          const res = await apiFetch("/api/vocabulary/export");
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "vocabulary.csv";
            a.click();
            URL.revokeObjectURL(url);
          }
        }}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search words or translations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mastery filter */}
      <div className="flex flex-wrap items-center gap-2">
        {MASTERY_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={masteryFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setMasteryFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort:
        </span>
        {SORT_OPTIONS.map((s) => (
          <Button
            key={s.value}
            variant={sortBy === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <Button variant="link" size="sm" className="ml-2" onClick={fetchVocabulary}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading vocabulary...</span>
        </div>
      ) : vocabulary.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Star className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            No words found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedSearch || masteryFilter >= 0
              ? "Try adjusting your filters or search query."
              : "Start reading articles and save new words to build your vocabulary."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-primary"
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="min-w-[140px]">Word</TableHead>
                <TableHead className="min-w-[100px]">Translation</TableHead>
                <TableHead className="hidden md:table-cell min-w-[180px]">Context</TableHead>
                <TableHead className="w-[100px]">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vocabulary.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <VocabularyRow
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    isExpanded={isExpanded}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onToggleExpand={() =>
                      setExpandedId(isExpanded ? null : item.id)
                    }
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bottom actions */}
      {vocabulary.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0 || deleting}
            onClick={handleDelete}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete Selected ({selectedIds.size})
          </Button>
          <Button asChild>
            <Link href="/vocabulary/review">Start Review</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

function VocabularyRow({
  item,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: {
  item: VocabularyItem;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <TableRow
        data-state={isSelected ? "selected" : undefined}
        className="cursor-pointer"
      >
        {/* Checkbox */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 accent-primary"
            aria-label={`Select ${item.word}`}
          />
        </TableCell>

        {/* Word + phonetic + speaker */}
        <TableCell onClick={onToggleExpand}>
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{item.word}</span>
                {item.pos && (
                  <span className="text-xs text-muted-foreground italic">
                    {item.pos}
                  </span>
                )}
              </div>
              {item.phonetic && (
                <span className="text-xs text-muted-foreground">
                  {item.phonetic}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speak(item.word);
              }}
              className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`Pronounce ${item.word}`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </TableCell>

        {/* Translation */}
        <TableCell onClick={onToggleExpand} className="whitespace-normal">
          {item.translation}
        </TableCell>

        {/* Context (hidden on small screens) */}
        <TableCell
          onClick={onToggleExpand}
          className="hidden md:table-cell text-muted-foreground whitespace-normal"
        >
          {item.context_sentence ? truncate(item.context_sentence, 60) : (
            <span className="text-muted-foreground/50 italic">--</span>
          )}
        </TableCell>

        {/* Mastery level */}
        <TableCell onClick={onToggleExpand}>
          <div className="flex flex-col items-start gap-1">
            <span className="text-amber-500 text-sm tracking-wider" aria-label={`Mastery level ${item.mastery_level} of 3`}>
              {getMasteryStars(item.mastery_level)}
            </span>
            <Badge
              variant={MASTERY_BADGE_VARIANT[item.mastery_level]}
              className={MASTERY_BADGE_CLASS[item.mastery_level]}
            >
              {MASTERY_LABELS[item.mastery_level]}
            </Badge>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded details */}
      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={5}>
            <div className="space-y-3 py-2 pl-6">
              {/* Definition */}
              {item.definition && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Definition
                  </span>
                  <p className="mt-0.5 text-sm">{item.definition}</p>
                </div>
              )}

              {/* Full context sentence */}
              {item.context_sentence && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Example / Context
                  </span>
                  <p className="mt-0.5 text-sm italic">
                    &ldquo;{item.context_sentence}&rdquo;
                  </p>
                </div>
              )}

              {/* Source article link */}
              {item.context_article_id && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Source Article
                  </span>
                  <p className="mt-0.5 text-sm">
                    <Link
                      href={`/articles/${item.context_article_id}`}
                      className="text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      {item.article_title || `Article #${item.context_article_id}`}
                    </Link>
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  Added:{" "}
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span>Reviews: {item.review_count}</span>
                {item.last_reviewed_at && (
                  <span>
                    Last reviewed:{" "}
                    {new Date(item.last_reviewed_at).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </div>

              {/* Expand/collapse hint */}
              <button
                type="button"
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronUp className="h-3 w-3" />
                Collapse
              </button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
