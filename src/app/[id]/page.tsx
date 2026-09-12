import Link from "next/link";
import { notFound } from "next/navigation";

import { consumePaste } from "@/lib/pastes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8 flex items-baseline justify-between">
        <Link href="/" className="font-display text-2xl">
          Pastebin
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          New paste
        </Link>
      </header>
      {children}
    </main>
  );
}

export default async function PastePage({ params }: Props) {
  const { id } = await params;
  const result = await consumePaste(id);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();

    return (
      <Frame>
        <div className="rounded-lg border border-line bg-card p-10 text-center">
          <h1 className="font-display text-2xl">This paste is gone</h1>
          <p className="mt-2 text-sm text-muted">
            It ran out of time or out of views, and the text has been discarded.
          </p>
        </div>
      </Frame>
    );
  }

  const { paste } = result;
  const lineCount = paste.content.split("\n").length;

  return (
    <Frame>
      <article className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="flex items-center gap-4 border-b border-line px-4 py-2.5 text-xs text-muted">
          <span className="font-mono text-ink">{paste.id}</span>
          <span>{lineCount} lines</span>
          <a href={`/raw/${paste.id}`} className="ml-auto hover:text-ink">
            raw
          </a>
        </div>

        <pre className="overflow-x-auto p-4 font-mono text-sm leading-6">{paste.content}</pre>
      </article>

      <p className="mt-4 text-xs text-muted">
        Created {new Date(paste.createdAt).toLocaleString()}
        {paste.expiresAt && ` · expires ${new Date(paste.expiresAt).toLocaleString()}`}
        {" · "}
        {paste.remainingViews === null
          ? `${paste.views} views`
          : `${paste.remainingViews} view${paste.remainingViews === 1 ? "" : "s"} left`}
      </p>
    </Frame>
  );
}
