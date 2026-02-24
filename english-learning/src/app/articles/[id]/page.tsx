"use client";

import { useParams } from "next/navigation";
import { ReaderPage } from "@/components/reader-page";

export default function ArticleReaderPage() {
  const params = useParams<{ id: string }>();

  return (
    <ReaderPage
      articleId={params.id}
      backUrl="/articles"
      backLabel="Back"
    />
  );
}
