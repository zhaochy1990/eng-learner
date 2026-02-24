"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ReaderPage, type ChapterNav } from "@/components/reader-page";
import { apiFetch } from "@/lib/api";
import type { Novel } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function ChapterReaderPage() {
  const params = useParams<{ novelId: string; chapterId: string }>();
  const [chapterNav, setChapterNav] = useState<ChapterNav | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNovel() {
      try {
        const res = await apiFetch(`/api/novels/${params.novelId}`);
        if (!res.ok) return;
        const novel: Novel = await res.json();
        const chapters = (novel.chapters ?? []).sort(
          (a, b) => a.chapter_number - b.chapter_number
        );
        const currentIndex = chapters.findIndex(
          (ch) => ch.id === Number(params.chapterId)
        );
        if (currentIndex !== -1) {
          setChapterNav({
            prevId: currentIndex > 0 ? chapters[currentIndex - 1].id : undefined,
            nextId:
              currentIndex < chapters.length - 1
                ? chapters[currentIndex + 1].id
                : undefined,
            novelId: Number(params.novelId),
            currentChapter: chapters[currentIndex].chapter_number,
            totalChapters: chapters.length,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchNovel();
  }, [params.novelId, params.chapterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReaderPage
      articleId={params.chapterId}
      backUrl={`/novels/${params.novelId}`}
      backLabel="Back to Novel"
      chapterNav={chapterNav}
      showDelete={false}
    />
  );
}
