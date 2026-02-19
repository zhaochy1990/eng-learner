"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { splitParagraphs, splitSentences } from "@/lib/text-utils";

const DEFAULT_VOICE = "en-US-JennyNeural";
const VOICE_STORAGE_KEY = "english-app-tts-voice";

export interface UseTTSOptions {
  text: string;
  rate?: number;
  voice?: string;
  onSentenceChange?: (sentenceIndex: number) => void;
  onParagraphChange?: (paragraphIndex: number) => void;
}

export interface UseTTSReturn {
  isPlaying: boolean;
  isLoading: boolean;
  currentSentenceIndex: number;
  currentParagraphIndex: number;
  totalSentences: number;
  totalParagraphs: number;
  rate: number;
  voice: string;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextSentence: () => void;
  prevSentence: () => void;
  nextParagraph: () => void;
  prevParagraph: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: string) => void;
  jumpToSentence: (index: number) => void;
  refresh: () => void;
}

interface SentenceInfo {
  text: string;
  paragraphIndex: number;
}

// C6 fix: use shared text-utils for splitting to stay in sync with article-reader
function splitTextIntoSentences(text: string): SentenceInfo[] {
  const paragraphs = splitParagraphs(text);
  const sentences: SentenceInfo[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const sentenceTexts = splitSentences(paragraphs[pIdx]);
    for (const sentenceText of sentenceTexts) {
      sentences.push({
        text: sentenceText,
        paragraphIndex: pIdx,
      });
    }
  }

  return sentences;
}

function countParagraphs(text: string): number {
  return splitParagraphs(text).length;
}

function getStoredVoice(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE;
  return localStorage.getItem(VOICE_STORAGE_KEY) || DEFAULT_VOICE;
}

export function useTTS(options: UseTTSOptions): UseTTSReturn {
  const { text, rate: initialRate = 1.0, onSentenceChange, onParagraphChange } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [rate, setRateState] = useState(initialRate);
  const [voice, setVoiceState] = useState(DEFAULT_VOICE);

  // Load voice from localStorage after hydration to avoid mismatch
  useEffect(() => {
    const stored = getStoredVoice();
    if (stored !== DEFAULT_VOICE) {
      setVoiceState(stored); // eslint-disable-line react-hooks/set-state-in-effect -- read from localStorage after hydration
    }
  }, []);

  // Refs for values accessed in async callbacks
  const currentSentenceIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const rateRef = useRef(initialRate);
  const voiceRef = useRef(DEFAULT_VOICE);
  const shouldContinueRef = useRef(false);

  // Audio playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAbortRef = useRef<AbortController | null>(null);

  // Prefetch cache: sentence index → blob URL
  const cacheRef = useRef<Map<number, string>>(new Map());
  const prefetchControllersRef = useRef<Set<AbortController>>(new Set());

  const sentences = useMemo(() => splitTextIntoSentences(text), [text]);
  const totalSentences = sentences.length;
  const totalParagraphs = useMemo(() => countParagraphs(text), [text]);

  const currentParagraphIndex =
    sentences.length > 0 && currentSentenceIndex < sentences.length
      ? sentences[currentSentenceIndex].paragraphIndex
      : 0;

  // Keep refs in sync with state
  useEffect(() => { currentSentenceIndexRef.current = currentSentenceIndex; }, [currentSentenceIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { voiceRef.current = voice; }, [voice]);

  // Store callbacks in refs to avoid stale closures
  const onSentenceChangeRef = useRef(onSentenceChange);
  const onParagraphChangeRef = useRef(onParagraphChange);
  useEffect(() => { onSentenceChangeRef.current = onSentenceChange; }, [onSentenceChange]);
  useEffect(() => { onParagraphChangeRef.current = onParagraphChange; }, [onParagraphChange]);

  // Fire callbacks when sentence/paragraph index changes
  const prevParagraphIndexRef = useRef(currentParagraphIndex);
  useEffect(() => {
    onSentenceChangeRef.current?.(currentSentenceIndex);
  }, [currentSentenceIndex]);

  useEffect(() => {
    if (prevParagraphIndexRef.current !== currentParagraphIndex) {
      prevParagraphIndexRef.current = currentParagraphIndex;
      onParagraphChangeRef.current?.(currentParagraphIndex);
    }
  }, [currentParagraphIndex]);

  // Clear all cached blob URLs and abort in-flight fetches
  const clearCache = useCallback(() => {
    for (const url of cacheRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    cacheRef.current.clear();
    for (const controller of prefetchControllersRef.current) {
      controller.abort();
    }
    prefetchControllersRef.current.clear();
    if (playAbortRef.current) {
      playAbortRef.current.abort();
      playAbortRef.current = null;
    }
  }, []);

  // Build TTS API URL for a given sentence text
  const buildUrl = useCallback((sentenceText: string) => {
    const params = new URLSearchParams({
      text: sentenceText,
      voice: voiceRef.current,
      rate: String(Math.round((rateRef.current - 1.0) * 100)),
    });
    return `/api/tts?${params.toString()}`;
  }, []);

  // Fetch audio for a sentence index, return blob URL or null
  const fetchAudio = useCallback(
    async (index: number, signal?: AbortSignal): Promise<string | null> => {
      if (index < 0 || index >= sentences.length) return null;

      const cached = cacheRef.current.get(index);
      if (cached) return cached;

      const url = buildUrl(sentences[index].text);
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        cacheRef.current.set(index, blobUrl);
        return blobUrl;
      } catch {
        return null;
      }
    },
    [sentences, buildUrl]
  );

  // Prefetch next 2 sentences
  const prefetch = useCallback(
    (fromIndex: number) => {
      for (let i = 1; i <= 2; i++) {
        const idx = fromIndex + i;
        if (idx >= sentences.length) break;
        if (cacheRef.current.has(idx)) continue;
        const controller = new AbortController();
        prefetchControllersRef.current.add(controller);
        fetchAudio(idx, controller.signal).finally(() => {
          prefetchControllersRef.current.delete(controller);
        });
      }
    },
    [sentences.length, fetchAudio]
  );

  // Ref for playSentence so onended can always call latest version
  const playSentenceRef = useRef<(index: number) => void>(() => {});

  const playSentence = useCallback(
    async (index: number) => {
      if (index < 0 || index >= sentences.length) {
        setIsPlaying(false);
        shouldContinueRef.current = false;
        return;
      }

      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Abort previous play fetch
      if (playAbortRef.current) {
        playAbortRef.current.abort();
      }

      setIsLoading(true);

      const controller = new AbortController();
      playAbortRef.current = controller;

      const blobUrl = await fetchAudio(index, controller.signal);

      // If aborted while fetching, bail
      if (controller.signal.aborted) return;

      setIsLoading(false);

      if (!blobUrl || !shouldContinueRef.current) {
        if (!shouldContinueRef.current) return;
        setIsPlaying(false);
        shouldContinueRef.current = false;
        return;
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      // Prefetch upcoming sentences
      prefetch(index);

      audio.onended = () => {
        if (shouldContinueRef.current) {
          const nextIdx = currentSentenceIndexRef.current + 1;
          if (nextIdx < sentences.length) {
            setCurrentSentenceIndex(nextIdx);
            currentSentenceIndexRef.current = nextIdx;
            playSentenceRef.current(nextIdx);
          } else {
            setIsPlaying(false);
            shouldContinueRef.current = false;
          }
        }
      };

      audio.onerror = () => {
        setIsPlaying(false);
        shouldContinueRef.current = false;
      };

      audio.play().catch(() => {
        setIsPlaying(false);
        shouldContinueRef.current = false;
      });
    },
    [sentences, fetchAudio, prefetch]
  );

  useEffect(() => {
    playSentenceRef.current = playSentence;
  }, [playSentence]);

  const play = useCallback(() => {
    if (sentences.length === 0) return;

    // If paused with an active audio element, resume
    if (audioRef.current && audioRef.current.paused && !audioRef.current.ended) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      shouldContinueRef.current = true;
      return;
    }

    // Start from current sentence
    setIsPlaying(true);
    shouldContinueRef.current = true;
    playSentence(currentSentenceIndexRef.current);
  }, [sentences.length, playSentence]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      // Keep shouldContinueRef true so resume picks up where it left off
    }
  }, []);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (playAbortRef.current) {
      playAbortRef.current.abort();
      playAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentSentenceIndex(0);
    currentSentenceIndexRef.current = 0;
  }, []);

  const nextSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndexRef.current + 1, sentences.length - 1);
    setCurrentSentenceIndex(nextIdx);
    currentSentenceIndexRef.current = nextIdx;

    if (isPlayingRef.current) {
      shouldContinueRef.current = true;
      playSentence(nextIdx);
    }
  }, [sentences.length, playSentence]);

  const prevSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const prevIdx = Math.max(currentSentenceIndexRef.current - 1, 0);
    setCurrentSentenceIndex(prevIdx);
    currentSentenceIndexRef.current = prevIdx;

    if (isPlayingRef.current) {
      shouldContinueRef.current = true;
      playSentence(prevIdx);
    }
  }, [sentences.length, playSentence]);

  const nextParagraph = useCallback(() => {
    if (sentences.length === 0) return;
    const currentParaIdx = sentences[currentSentenceIndexRef.current]?.paragraphIndex ?? 0;
    const nextIdx = sentences.findIndex((s) => s.paragraphIndex > currentParaIdx);
    if (nextIdx !== -1) {
      setCurrentSentenceIndex(nextIdx);
      currentSentenceIndexRef.current = nextIdx;

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(nextIdx);
      }
    }
  }, [sentences, playSentence]);

  const prevParagraph = useCallback(() => {
    if (sentences.length === 0) return;
    const currentParaIdx = sentences[currentSentenceIndexRef.current]?.paragraphIndex ?? 0;

    if (currentParaIdx === 0) {
      setCurrentSentenceIndex(0);
      currentSentenceIndexRef.current = 0;

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(0);
      }
      return;
    }

    const targetParaIdx = currentParaIdx - 1;
    const prevIdx = sentences.findIndex((s) => s.paragraphIndex === targetParaIdx);
    if (prevIdx !== -1) {
      setCurrentSentenceIndex(prevIdx);
      currentSentenceIndexRef.current = prevIdx;

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(prevIdx);
      }
    }
  }, [sentences, playSentence]);

  const setRate = useCallback(
    (newRate: number) => {
      const clampedRate = Math.max(0.5, Math.min(1.5, newRate));
      setRateState(clampedRate);
      rateRef.current = clampedRate;

      // Clear cache since rate changed
      clearCache();

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(currentSentenceIndexRef.current);
      }
    },
    [clearCache, playSentence]
  );

  const setVoice = useCallback(
    (newVoice: string) => {
      setVoiceState(newVoice);
      voiceRef.current = newVoice;
      localStorage.setItem(VOICE_STORAGE_KEY, newVoice);

      // Clear cache since voice changed
      clearCache();

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(currentSentenceIndexRef.current);
      }
    },
    [clearCache, playSentence]
  );

  const jumpToSentence = useCallback(
    (index: number) => {
      if (index < 0 || index >= sentences.length) return;
      setCurrentSentenceIndex(index);
      currentSentenceIndexRef.current = index;

      if (isPlayingRef.current) {
        shouldContinueRef.current = true;
        playSentence(index);
      }
    },
    [sentences.length, playSentence]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      if (playAbortRef.current) {
        playAbortRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      clearCache();
    };
  }, [clearCache]);

  const refresh = useCallback(() => {
    stop();
    clearCache();
    setCurrentSentenceIndex(0);
    currentSentenceIndexRef.current = 0;
    // Start playing from beginning after clearing
    setTimeout(() => {
      setIsPlaying(true);
      shouldContinueRef.current = true;
      playSentenceRef.current(0);
    }, 0);
  }, [stop, clearCache]);

  // Reset when text changes — stop playback and clear cache
  useEffect(() => {
    stop(); // eslint-disable-line react-hooks/set-state-in-effect -- reset state when text prop changes
    clearCache();
  }, [text, stop, clearCache]);

  return {
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
    stop,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
    setRate,
    setVoice,
    jumpToSentence,
    refresh,
  };
}
