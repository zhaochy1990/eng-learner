"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardPaste,
  Link,
  Sparkles,
  Rss,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AddArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArticleAdded: () => void;
}

export function AddArticleDialog({
  open,
  onOpenChange,
  onArticleAdded,
}: AddArticleDialogProps) {
  const [activeTab, setActiveTab] = useState("paste");
  const [submitting, setSubmitting] = useState(false);

  // Paste Text tab state
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteDifficulty, setPasteDifficulty] = useState("intermediate");
  const [pasteCategory, setPasteCategory] = useState("general");

  // Import URL tab state
  const [importUrl, setImportUrl] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importDifficulty, setImportDifficulty] = useState("intermediate");
  const [importCategory, setImportCategory] = useState("general");
  const [importFetched, setImportFetched] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // AI Generate tab state
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiLength, setAiLength] = useState("medium");
  const [aiMessage, setAiMessage] = useState("");

  // Web Search (Browse) tab state
  const [feedCategory, setFeedCategory] = useState("all");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchResults, setSearchResults] = useState<
    { title: string; url: string; snippet: string; source?: string; category?: string; pubDate?: string | null }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const feedsLoadedRef = useRef(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(false);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchContent, setSearchContent] = useState("");
  const [searchDifficulty, setSearchDifficulty] = useState("intermediate");
  const [searchCategory, setSearchCategory] = useState("general");
  const [searchSourceUrl, setSearchSourceUrl] = useState("");
  const [searchSummary, setSearchSummary] = useState("");

  function resetForm() {
    setPasteTitle("");
    setPasteContent("");
    setPasteDifficulty("intermediate");
    setPasteCategory("general");
    setImportUrl("");
    setImportTitle("");
    setImportContent("");
    setImportDifficulty("intermediate");
    setImportCategory("general");
    setImportFetched(false);
    setImportMessage("");
    setAiTopic("");
    setAiDifficulty("intermediate");
    setAiLength("medium");
    setAiMessage("");
    setFeedCategory("all");
    setSearchKeywords("");
    setSearchMessage("");
    setSearchResults([]);
    setSearchLoading(false);
    feedsLoadedRef.current = false;
    setExtracting(false);
    setExtractedData(false);
    setSearchTitle("");
    setSearchContent("");
    setSearchDifficulty("intermediate");
    setSearchCategory("general");
    setSearchSourceUrl("");
    setSearchSummary("");
    setActiveTab("paste");
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetForm();
    }
    onOpenChange(value);
  }

  async function handleSubmit() {
    let title = "";
    let content = "";
    let difficulty = "intermediate";
    let category = "general";
    let source_url: string | undefined;

    if (activeTab === "paste") {
      title = pasteTitle.trim();
      content = pasteContent.trim();
      difficulty = pasteDifficulty;
      category = pasteCategory;
    } else if (activeTab === "import") {
      title = importTitle.trim();
      content = importContent.trim();
      difficulty = importDifficulty;
      category = importCategory;
      source_url = importUrl.trim() || undefined;
    } else if (activeTab === "search") {
      title = searchTitle.trim();
      content = searchContent.trim();
      difficulty = searchDifficulty;
      category = searchCategory;
      source_url = searchSourceUrl || undefined;
    } else {
      return;
    }

    if (!title || !content) {
      return;
    }

    let summary: string | undefined;
    if (activeTab === "search" && searchSummary) {
      summary = searchSummary;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, difficulty, category, source_url, summary }),
      });

      if (res.ok) {
        resetForm();
        onOpenChange(false);
        onArticleAdded();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleFetchUrl() {
    if (!importUrl.trim()) return;
    setImportMessage(
      "URL import will extract article content from the provided URL. This feature requires server-side implementation."
    );
    setImportFetched(true);
  }

  function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setAiMessage(
      "AI generation requires an API key configuration. Coming soon!"
    );
  }

  async function handleBrowseFeeds(category?: string, keywords?: string) {
    setSearchMessage("");
    setSearchLoading(true);
    setSearchResults([]);
    setExtractedData(false);
    try {
      const params = new URLSearchParams();
      const cat = category ?? feedCategory;
      if (cat && cat !== "all") params.set("category", cat);
      const q = keywords ?? searchKeywords.trim();
      if (q) params.set("q", q);
      const qs = params.toString();
      const res = await apiFetch(`/api/search${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSearchMessage(data.error || "Failed to load feeds");
        return;
      }
      const results = await res.json();
      if (results.length === 0) {
        setSearchMessage("No articles found. Try a different category or keywords.");
        return;
      }
      setSearchResults(results);
    } catch {
      setSearchMessage("Failed to load feeds. Check your connection.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Auto-load feeds when Browse tab is first opened
  useEffect(() => {
    if (activeTab !== "search" || feedsLoadedRef.current) return;
    feedsLoadedRef.current = true;
    (async () => {
      setSearchLoading(true);
      try {
        const res = await apiFetch("/api/search");
        if (!res.ok) return;
        const results = await res.json();
        if (results.length > 0) setSearchResults(results);
      } catch {
        // ignore — user can click Browse manually
      } finally {
        setSearchLoading(false);
      }
    })();
  }, [activeTab]);

  async function handleExtract(url: string) {
    setExtracting(true);
    setSearchMessage("");
    try {
      const res = await apiFetch("/api/search/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSearchMessage(data.error || "Extraction failed");
        return;
      }
      const data = await res.json();
      setSearchTitle(data.title || "");
      setSearchContent(data.content || "");
      setSearchDifficulty(data.difficulty || "intermediate");
      setSearchCategory(data.category || "general");
      setSearchSummary(data.summary || "");
      setSearchSourceUrl(url);
      setExtractedData(true);
    } catch {
      setSearchMessage("Extraction request failed. Check your connection.");
    } finally {
      setExtracting(false);
    }
  }

  const canSubmit =
    (activeTab === "paste" && pasteTitle.trim() && pasteContent.trim()) ||
    (activeTab === "import" && importTitle.trim() && importContent.trim()) ||
    (activeTab === "search" && searchTitle.trim() && searchContent.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Article</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="paste" className="flex items-center gap-1.5">
              <ClipboardPaste className="size-3.5" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-1.5">
              <Link className="size-3.5" />
              Import URL
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              AI
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1.5">
              <Rss className="size-3.5" />
              Browse
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Paste Text */}
          <TabsContent value="paste" className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Article title"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <textarea
                className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[200px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                placeholder="Paste your article content here..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={pasteDifficulty} onValueChange={setPasteDifficulty}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={pasteCategory} onValueChange={setPasteCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Import URL */}
          <TabsContent value="import" className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/article"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleFetchUrl}
                  disabled={!importUrl.trim()}
                >
                  Fetch
                </Button>
              </div>
            </div>

            {importMessage && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {importMessage}
              </div>
            )}

            {importFetched && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Article title"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <textarea
                    className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[160px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                    placeholder="Paste or edit article content here..."
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select
                      value={importDifficulty}
                      onValueChange={setImportDifficulty}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={importCategory}
                      onValueChange={setImportCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab 3: AI Generate */}
          <TabsContent value="ai" className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Input
                placeholder="e.g., Climate change, Remote work, Space exploration"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Approximate Length</label>
                <Select value={aiLength} onValueChange={setAiLength}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~200 words)</SelectItem>
                    <SelectItem value="medium">Medium (~400 words)</SelectItem>
                    <SelectItem value="long">Long (~600 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAiGenerate}
              disabled={!aiTopic.trim()}
              className="w-full"
            >
              <Sparkles className="size-4" />
              Generate Article
            </Button>

            {aiMessage && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {aiMessage}
              </div>
            )}

            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Generated content will appear here
            </div>
          </TabsContent>

          {/* Tab 4: Browse RSS Feeds */}
          <TabsContent value="search" className="space-y-4 mt-2">
            {!extractedData ? (
              <>
                <div className="flex gap-2">
                  <Select
                    value={feedCategory}
                    onValueChange={(val) => {
                      setFeedCategory(val);
                      handleBrowseFeeds(val, searchKeywords.trim());
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Filter by keywords..."
                    value={searchKeywords}
                    onChange={(e) => setSearchKeywords(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBrowseFeeds();
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleBrowseFeeds()}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Rss className="size-4" />
                    )}
                    Browse
                  </Button>
                </div>

                {searchMessage && (
                  <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    {searchMessage}
                  </div>
                )}

                {extracting && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Extracting article content...
                  </div>
                )}

                {!extracting && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        onClick={() => handleExtract(result.url)}
                        className="w-full text-left rounded-md border p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm line-clamp-1 flex-1">
                            {result.title}
                          </span>
                          {result.source && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {result.source}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.snippet}
                        </div>
                        {result.pubDate && (
                          <div className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(result.pubDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {!extracting && searchResults.length === 0 && !searchMessage && !searchLoading && (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Browse English articles from curated RSS feeds
                  </div>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtractedData(false)}
                >
                  &larr; Back to results
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <textarea
                    className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[200px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                    value={searchContent}
                    onChange={(e) => setSearchContent(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select
                      value={searchDifficulty}
                      onValueChange={setSearchDifficulty}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={searchCategory}
                      onValueChange={setSearchCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
