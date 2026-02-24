export interface Chapter {
  title: string;
  paragraphIndex: number;
}

export function parseChapters(content: string): Chapter[] {
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  const chapters: Chapter[] = [];

  paragraphs.forEach((para, index) => {
    const trimmed = para.trim();
    if (trimmed.startsWith('## ')) {
      chapters.push({
        title: trimmed.slice(3).trim(),
        paragraphIndex: index,
      });
    }
  });

  return chapters;
}
