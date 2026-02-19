"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export interface VocabularyItem {
  word: string;
  phonetic: string | null;
  translation: string;
  pos: string | null;
  definition: string | null;
}

export function filterVocabularyByArticle(
  vocabularyItems: VocabularyItem[],
  articleContent: string
): VocabularyItem[] {
  const wordsInArticle = new Set(
    articleContent.toLowerCase().match(/[a-z'-]+/g) ?? []
  );
  return vocabularyItems.filter((item) =>
    wordsInArticle.has(item.word.toLowerCase())
  );
}

interface VocabularySidebarProps {
  words: VocabularyItem[];
}

export function VocabularySidebar({ words }: VocabularySidebarProps) {
  return (
    <aside className="sticky top-6 hidden lg:block w-64 shrink-0">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>生词本</span>
            <Badge variant="secondary" className="text-xs">
              {words.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {words.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <BookOpen className="h-8 w-8 opacity-50" />
              <p className="text-sm text-center">
                Click words in the article and save them to build your vocabulary list.
              </p>
            </div>
          ) : (
            <ul className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-3 pr-1">
              {words.map((item) => (
                <li key={item.word} className="text-sm">
                  <p className="font-semibold leading-tight">{item.word}</p>
                  {item.phonetic && (
                    <p className="text-xs text-muted-foreground">
                      /{item.phonetic}/
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {item.translation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
