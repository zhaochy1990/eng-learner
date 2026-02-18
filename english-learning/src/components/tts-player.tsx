"use client";

import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseTTSReturn } from "@/hooks/use-tts";

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

const VOICE_OPTIONS = [
  { id: "en-US-JennyNeural", label: "Jenny (Female)" },
  { id: "en-US-GuyNeural", label: "Guy (Male)" },
  { id: "en-US-AriaNeural", label: "Aria (Female)" },
  { id: "en-US-ChristopherNeural", label: "Christopher (Male)" },
] as const;

type TTSPlayerProps = UseTTSReturn;

export function TTSPlayer({
  isPlaying,
  isLoading,
  currentSentenceIndex,
  currentParagraphIndex,
  totalSentences,
  totalParagraphs,
  rate,
  voice,
  play,
  pause,
  nextSentence,
  prevSentence,
  nextParagraph,
  prevParagraph,
  setRate,
  setVoice,
}: TTSPlayerProps) {
  const isAtStart = currentSentenceIndex === 0;
  const isAtEnd = currentSentenceIndex >= totalSentences - 1;
  const isEmpty = totalSentences === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 py-3">
        {/* Transport controls */}
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {/* Previous paragraph */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={prevParagraph}
            disabled={isEmpty || isAtStart}
            title="Previous paragraph"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Previous sentence */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={prevSentence}
            disabled={isEmpty || isAtStart}
            title="Previous sentence"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Play / Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={isPlaying ? pause : play}
            disabled={isEmpty || isLoading}
            title={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
            className="mx-1"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Next sentence */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={nextSentence}
            disabled={isEmpty || isAtEnd}
            title="Next sentence"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Next paragraph */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={nextParagraph}
            disabled={isEmpty || isAtEnd}
            title="Next paragraph"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Voice selector */}
        <div className="mt-2 flex items-center justify-center">
          <Select value={voice} onValueChange={setVoice}>
            <SelectTrigger size="sm" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speed controls */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {SPEED_OPTIONS.map((speed) => (
            <Button
              key={speed}
              variant={Math.abs(rate - speed) < 0.01 ? "default" : "outline"}
              size="xs"
              onClick={() => setRate(speed)}
              className="min-w-[3rem]"
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Progress info */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {isEmpty ? (
            <span>No text to read</span>
          ) : (
            <span>
              Sentence {currentSentenceIndex + 1} of {totalSentences}
              <span className="mx-2">|</span>
              Paragraph {currentParagraphIndex + 1} of {totalParagraphs}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
