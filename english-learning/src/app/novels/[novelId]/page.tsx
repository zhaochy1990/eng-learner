"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Plus,
  Loader2,
  Trash2,
  Check,
  Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DIFFICULTY_COLOR, type Novel, type NovelChapter } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

function getChapterStatus(chapter: NovelChapter): "completed" | "in-progress" | "not-started" {
  if (chapter.completed === 1) return "completed";
  if (chapter.current_sentence != null && chapter.current_sentence > 0) return "in-progress";
  if (chapter.scroll_position != null && chapter.scroll_position > 0) return "in-progress";
  if (chapter.last_read_at) return "in-progress";
  return "not-started";
}

export default function NovelDetailPage() {
  const params = useParams<{ novelId: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchNovel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/novels/${params.novelId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Novel not found." : "Failed to load novel.");
        return;
      }
      const data = await res.json();
      setNovel(data);
    } catch {
      setError("Failed to load novel.");
    } finally {
      setLoading(false);
    }
  }, [params.novelId]);

  useEffect(() => {
    fetchNovel();
  }, [fetchNovel]);

  async function handleAddChapter() {
    if (!chapterTitle.trim() || !chapterContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/novels/${params.novelId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
        }),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setChapterTitle("");
        setChapterContent("");
        fetchNovel();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNovel() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/novels/${params.novelId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/novels");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading novel...
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold text-muted-foreground">
          {error || "Novel not found"}
        </h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/novels">
            <ArrowLeft className="size-4" />
            Back to Novels
          </Link>
        </Button>
      </div>
    );
  }

  const chapters = novel.chapters ?? [];
  const completedCount = chapters.filter((c) => c.completed === 1).length;
  const totalChapters = chapters.length;
  const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
  const totalWordCount = novel.total_word_count ?? chapters.reduce((sum, c) => sum + c.word_count, 0);
  const totalReadingTime = chapters.reduce((sum, c) => sum + c.reading_time, 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/novels">
          <ArrowLeft className="size-4" />
          Back to Novels
        </Link>
      </Button>

      {/* Novel header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{novel.title}</h1>
            {novel.author && (
              <p className="text-sm text-muted-foreground">by {novel.author}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {novel.difficulty && (
              <Badge
                variant="secondary"
                className={DIFFICULTY_COLOR[novel.difficulty] || ""}
              >
                {novel.difficulty.charAt(0).toUpperCase() + novel.difficulty.slice(1)}
              </Badge>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {novel.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {novel.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-4" />
            {totalChapters} {totalChapters === 1 ? "chapter" : "chapters"}
          </span>
          {totalWordCount > 0 && (
            <span className="inline-flex items-center gap-1">
              {totalWordCount.toLocaleString()} words
            </span>
          )}
          {totalReadingTime > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" />
              ~{totalReadingTime} min
            </span>
          )}
        </div>

        {/* Overall progress */}
        {totalChapters > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount} of {totalChapters} chapters completed
              </span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </div>

      <Separator />

      {/* Chapter list header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chapters</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4" />
            Add Chapter
          </Button>
        )}
      </div>

      {/* Chapter list */}
      {chapters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No chapters yet.</p>
          {isAdmin && (
            <Button size="sm" className="mt-3" onClick={() => setAddDialogOpen(true)}>
              <Plus className="size-4" />
              Add First Chapter
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map((chapter) => {
            const status = getChapterStatus(chapter);
            return (
              <Link
                key={chapter.id}
                href={`/novels/${novel.id}/chapters/${chapter.id}`}
                className="block"
              >
                <Card className="py-0 transition-colors hover:bg-accent/50 cursor-pointer">
                  <CardContent className="flex items-center gap-4 px-4 py-3">
                    {/* Status indicator */}
                    <div className="shrink-0">
                      {status === "completed" ? (
                        <div className="flex items-center justify-center size-6 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="size-3.5" />
                        </div>
                      ) : status === "in-progress" ? (
                        <div className="flex items-center justify-center size-6 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Circle className="size-2.5 fill-blue-500 text-blue-500" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center size-6 rounded-full bg-muted">
                          <Circle className="size-2.5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Chapter info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          Ch. {chapter.chapter_number}
                        </span>
                        <span className="font-medium text-sm truncate">
                          {chapter.title}
                        </span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {chapter.word_count.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {chapter.reading_time} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Chapter Dialog */}
      {isAdmin && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Chapter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="chapter-title">Title *</Label>
                <Input
                  id="chapter-title"
                  placeholder="Enter chapter title"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapter-content">Content *</Label>
                <Textarea
                  id="chapter-content"
                  placeholder="Paste chapter content here..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  rows={12}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddChapter}
                disabled={!chapterTitle.trim() || !chapterContent.trim() || submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Add Chapter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {isAdmin && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Novel</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete &ldquo;{novel.title}&rdquo;? This will also
              delete all chapters. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteNovel}
                disabled={deleting}
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
