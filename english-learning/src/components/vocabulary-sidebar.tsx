"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { getBaseForms } from "@/lib/text-utils";

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
  const articleBaseForms = new Set<string>();
  const words = articleContent.toLowerCase().match(/[a-z'-]+/g) ?? [];
  for (const w of words) {
    for (const form of getBaseForms(w)) {
      articleBaseForms.add(form);
    }
  }
  return vocabularyItems.filter((item) =>
    articleBaseForms.has(item.word.toLowerCase())
  );
}

interface VocabularySidebarProps {
  words: VocabularyItem[];
}

export function VocabularySidebar({ words }: VocabularySidebarProps) {
  return (
    <aside className="sticky top-6 hidden lg:block w-80 min-w-72 max-w-96 shrink-0">
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
            <ul className="max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-hide space-y-3">
              {words.map((item) => (
                <li key={item.word} className="text-sm">
                  <div className="flex items-center gap-1">
                    <p className="text-base font-semibold leading-tight">{item.word}</p>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => speak(item.word)}
                      title="Pronounce"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {item.phonetic && (
                    <p className="text-xs text-muted-foreground">
                      /{item.phonetic}/
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
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
