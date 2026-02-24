"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookText, Plus, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DIFFICULTY_COLOR, type Novel } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function NovelsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add novel form state
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("intermediate");

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/novels");
      if (res.ok) {
        const data = await res.json();
        setNovels(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const filteredNovels =
    difficulty === "all"
      ? novels
      : novels.filter((n) => n.difficulty === difficulty);

  function getProgress(novel: Novel): number | null {
    const chapters = novel.chapter_count ?? novel.total_chapters;
    const completed = novel.completed_chapters ?? 0;
    if (completed === 0) return null;
    if (chapters === 0) return null;
    return Math.round((completed / chapters) * 100);
  }

  async function handleAddNovel() {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          author: formAuthor.trim() || undefined,
          description: formDescription.trim() || undefined,
          difficulty: formDifficulty,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setFormTitle("");
        setFormAuthor("");
        setFormDescription("");
        setFormDifficulty("intermediate");
        fetchNovels();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Novels</h1>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add Novel
          </Button>
        )}
      </div>

      {/* Difficulty filters */}
      <div className="flex flex-wrap gap-2">
        {DIFFICULTY_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={difficulty === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDifficulty(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Novel List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          Loading novels...
        </div>
      ) : filteredNovels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookText className="size-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            No novels found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground/80">
            {difficulty !== "all"
              ? "Try adjusting your difficulty filter."
              : "Add your first novel to get started."}
          </p>
          {isAdmin && difficulty === "all" && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Add Novel
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredNovels.map((novel) => {
            const progress = getProgress(novel);
            const chapters = novel.chapter_count ?? novel.total_chapters;
            return (
              <Card key={novel.id} className="py-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-1 min-w-0 p-5">
                    <CardHeader className="p-0 gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-base leading-snug line-clamp-1">
                          <Link href={`/novels/${novel.id}`} className="hover:underline">
                            {novel.title}
                          </Link>
                        </h3>
                        {novel.difficulty && (
                          <Badge
                            variant="secondary"
                            className={`shrink-0 ${DIFFICULTY_COLOR[novel.difficulty] || ""}`}
                          >
                            {novel.difficulty.charAt(0).toUpperCase() +
                              novel.difficulty.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-2">
                      {novel.author && (
                        <p className="text-sm text-muted-foreground mb-1">
                          by {novel.author}
                        </p>
                      )}
                      {novel.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {novel.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          {chapters} {chapters === 1 ? "chapter" : "chapters"}
                        </span>
                        {novel.total_word_count != null && novel.total_word_count > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <BookText className="size-3.5" />
                            {novel.total_word_count.toLocaleString()} words
                          </span>
                        )}
                      </div>
                      {progress !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {progress === 100 ? "Completed" : `${progress}%`}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </div>
                  <CardFooter className="p-5 sm:pl-0 pt-0 sm:pt-5 flex items-center justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/novels/${novel.id}`}>
                        Read
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Novel Dialog */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Novel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="novel-title">Title *</Label>
                <Input
                  id="novel-title"
                  placeholder="Enter novel title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novel-author">Author</Label>
                <Input
                  id="novel-author"
                  placeholder="Enter author name"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novel-description">Description</Label>
                <Textarea
                  id="novel-description"
                  placeholder="Enter a brief description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novel-difficulty">Difficulty</Label>
                <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                  <SelectTrigger id="novel-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNovel}
                disabled={!formTitle.trim() || submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Add Novel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
