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
  const baseFormFirstPos = new Map<string, number>();
  const words = articleContent.toLowerCase().match(/[a-z'-]+/g) ?? [];
  for (let i = 0; i < words.length; i++) {
    for (const form of getBaseForms(words[i])) {
      if (!baseFormFirstPos.has(form)) {
        baseFormFirstPos.set(form, i);
      }
    }
  }
  return vocabularyItems
    .filter((item) => baseFormFirstPos.has(item.word.toLowerCase()))
    .sort((a, b) =>
      (baseFormFirstPos.get(a.word.toLowerCase()) ?? 0) -
      (baseFormFirstPos.get(b.word.toLowerCase()) ?? 0)
    );
}

interface VocabularySidebarProps {
  words: VocabularyItem[];
  bare?: boolean;
}

export function VocabularySidebar({ words, bare }: VocabularySidebarProps) {
  const card = (
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
            <ul className="space-y-3">
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
  );

  if (bare) return card;

  return (
    <aside className="hidden lg:block w-80 min-w-72 max-w-96 shrink-0">
      {card}
    </aside>
  );
}
