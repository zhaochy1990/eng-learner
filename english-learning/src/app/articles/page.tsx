"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Plus, Clock, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AddArticleDialog } from "@/components/add-article-dialog";
import type { Article } from "@/lib/types";
import { apiUrl } from "@/lib/api";

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Topics" },
  { value: "business", label: "Business" },
  { value: "tech", label: "Tech" },
  { value: "daily", label: "Daily" },
  { value: "news", label: "News" },
];

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchArticles = useCallback(
    async (params?: { difficulty?: string; category?: string; search?: string }) => {
      const d = params?.difficulty ?? difficulty;
      const c = params?.category ?? category;
      const s = params?.search ?? searchQuery;

      const query = new URLSearchParams();
      if (d && d !== "all") query.set("difficulty", d);
      if (c && c !== "all") query.set("category", c);
      if (s.trim()) query.set("search", s.trim());

      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/articles?${query.toString()}`));
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [difficulty, category, searchQuery]
  );

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, category]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchArticles({ search: value });
    }, 400);
  }

  function handleDifficultyChange(value: string) {
    setDifficulty(value);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
  }

  function handleArticleAdded() {
    fetchArticles();
  }

  function getReadingProgress(article: Article): number | null {
    if (article.scroll_position == null && article.completed == null) {
      return null;
    }
    if (article.completed === 1) return 100;
    if (article.scroll_position != null && article.scroll_position > 0) {
      return Math.round(article.scroll_position * 100);
    }
    return 0;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Add Article
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Difficulty filters */}
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={difficulty === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleDifficultyChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={category === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading articles...
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            No articles found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground/80">
            {searchQuery || difficulty !== "all" || category !== "all"
              ? "Try adjusting your filters or search query."
              : "Add your first article to get started."}
          </p>
          {!searchQuery && difficulty === "all" && category === "all" && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Add Article
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((article) => {
            const progress = getReadingProgress(article);
            return (
              <Card key={article.id} className="py-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-1 min-w-0 p-5">
                    <CardHeader className="p-0 gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-base leading-snug line-clamp-1">
                          {article.title}
                        </h3>
                        {article.difficulty && (
                        <Badge
                          variant="secondary"
                          className={`shrink-0 ${difficultyColor[article.difficulty] || ""}`}
                        >
                          {article.difficulty.charAt(0).toUpperCase() +
                            article.difficulty.slice(1)}
                        </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-2">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {truncate(article.summary || article.content, 150)}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          ~{article.reading_time} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          {article.word_count} words
                        </span>
                        {article.category && article.category !== "general" && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            {article.category.charAt(0).toUpperCase() +
                              article.category.slice(1)}
                          </Badge>
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
                      <Link href={`/articles/${article.id}`}>
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

      {/* Add Article Dialog */}
      <AddArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onArticleAdded={handleArticleAdded}
      />
    </div>
  );
}
