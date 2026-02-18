"use client";

import { useState } from "react";
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
  Search,
  Loader2,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

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

  // Web Search tab state
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchMessage, setSearchMessage] = useState("");

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
    setSearchKeywords("");
    setSearchMessage("");
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
    } else {
      return;
    }

    if (!title || !content) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/articles"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, difficulty, category, source_url }),
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

  function handleWebSearch() {
    if (!searchKeywords.trim()) return;
    setSearchMessage("Web search integration coming soon!");
  }

  const canSubmit =
    (activeTab === "paste" && pasteTitle.trim() && pasteContent.trim()) ||
    (activeTab === "import" && importTitle.trim() && importContent.trim());

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
              <Search className="size-3.5" />
              Search
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

          {/* Tab 4: Web Search */}
          <TabsContent value="search" className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Keywords</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., technology trends 2026"
                  value={searchKeywords}
                  onChange={(e) => setSearchKeywords(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleWebSearch}
                  disabled={!searchKeywords.trim()}
                >
                  <Search className="size-4" />
                  Search
                </Button>
              </div>
            </div>

            {searchMessage && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {searchMessage}
              </div>
            )}

            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Search results will appear here
            </div>
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
