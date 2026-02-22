"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  GraduationCap,
  Clock,
  ArrowRight,
  Library,
  Star,
  Brain,
} from "lucide-react";
import type { Article } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { getReadingProgress } from "@/lib/text-utils";

interface Stats {
  totalWords: number;
  masteredWords: number;
  dueWords: number;
  totalArticles: number;
  lastReadArticle: (Article & {
    scroll_position: number;
    current_sentence: number;
    completed: number;
  }) | null;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastReadProgress, setLastReadProgress] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, articlesRes] = await Promise.all([
          apiFetch("/api/stats"),
          apiFetch("/api/articles"),
        ]);
        const statsData = await statsRes.json();
        const articlesData = await articlesRes.json();
        setStats(statsData);
        setRecentArticles(articlesData.slice(0, 8));
        if (statsData.lastReadArticle) {
          const match = articlesData.find((a: Article) => a.id === statsData.lastReadArticle.id);
          setLastReadProgress(getReadingProgress(match || statsData.lastReadArticle) ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const lastRead = stats?.lastReadArticle;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your learning overview.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.totalWords || 0}</p>
                <p className="text-sm text-muted-foreground">Words Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {stats?.masteredWords || 0}
                </p>
                <p className="text-sm text-muted-foreground">Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <Brain className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.dueWords || 0}</p>
                <p className="text-sm text-muted-foreground">Due Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Reading & Review Reminder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Library className="h-5 w-5" />
              Continue Reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastRead ? (
              <div className="space-y-3">
                <p className="font-medium">{lastRead.title}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{lastReadProgress}%</span>
                  </div>
                  <Progress value={lastReadProgress} className="h-2" />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No article in progress. Start reading from the article library!
              </p>
            )}
          </CardContent>
          <CardFooter>
            {lastRead ? (
              <Link href={`/articles/${lastRead.id}`}>
                <Button variant="default" size="sm">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/articles">
                <Button variant="outline" size="sm">
                  Browse Articles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Words Due for Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.dueWords || 0) > 0 ? (
              <p className="text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">
                  {stats?.dueWords}
                </span>{" "}
                words due today
              </p>
            ) : (
              <p className="text-muted-foreground">
                No words due for review. You&apos;re all caught up!
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/vocabulary/review">
              <Button
                variant={(stats?.dueWords || 0) > 0 ? "default" : "outline"}
                size="sm"
              >
                Start Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Articles */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Articles</h2>
        {recentArticles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentArticles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                        {article.title}
                      </CardTitle>
                    </div>
                    {article.difficulty && (
                    <Badge
                      variant="secondary"
                      className={`w-fit text-xs ${
                        difficultyColors[article.difficulty] || ""
                      }`}
                    >
                      {article.difficulty}
                    </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {article.summary}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />~{article.reading_time}{" "}
                        min
                      </span>
                      <span>{article.word_count} words</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No articles yet. Add some from the article library!</p>
              <Link href="/articles">
                <Button variant="outline" className="mt-4">
                  Go to Articles
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
