"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/chapter-utils";

interface ChapterNavProps {
  chapters: Chapter[];
  currentChapter: number;
  onChapterClick: (paragraphIndex: number) => void;
}

export function ChapterNav({ chapters, currentChapter, onChapterClick }: ChapterNavProps) {
  if (chapters.length === 0) return null;

  return (
    <nav className="space-y-1">
      {chapters.map((chapter, index) => (
        <button
          key={chapter.paragraphIndex}
          onClick={() => onChapterClick(chapter.paragraphIndex)}
          className={cn(
            "w-full text-left text-sm px-3 py-2 rounded-md transition-colors truncate",
            currentChapter === index
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={chapter.title}
        >
          {chapter.title}
        </button>
      ))}
    </nav>
  );
}
