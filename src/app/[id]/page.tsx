import Link from "next/link";
import { notFound } from "next/navigation";

import LocalTime from "@/components/LocalTime";
import PasswordGate from "@/components/PasswordGate";
import WordMark from "@/components/WordMark";
import { highlight } from "@/lib/highlight";
import { consumePaste } from "@/lib/pastes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-6 flex items-baseline justify-between gap-4 sm:mb-8">
        <Link href="/" className="font-display text-xl sm:text-2xl">
          <WordMark />
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

    if (
      result.reason === "password_required" ||
      result.reason === "wrong_password"
    ) {
      return (
        <Frame>
          <PasswordGate id={id} />
        </Frame>
      );
    }

    return (
      <Frame>
        <div className="rounded-lg border border-line bg-card p-8 text-center sm:p-10">
          <h1 className="font-display text-2xl">This paste is gone</h1>
          <p className="mt-2 text-sm text-muted">
            It ran out of time or out of views, and the text has been discarded.
          </p>
        </div>
      </Frame>
    );
  }

  const { paste } = result;
  const lines = paste.content.split("\n");

  return (
    <Frame>
      <article className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 text-xs text-muted">
          <span className="font-mono text-ink">
            {paste.filename ?? paste.id}
          </span>
          {paste.language && <span>{paste.language}</span>}
          <span>{lines.length} lines</span>
          <a href={`/raw/${paste.id}`} className="ml-auto hover:text-ink">
            raw
          </a>
        </div>

        <div className="flex overflow-x-auto">
          <div
            aria-hidden
            className="shrink-0 border-r border-line px-3 py-4 text-right font-mono text-xs leading-6 text-muted/50 select-none"
          >
            {lines.map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <pre className="min-w-0 flex-1 px-4 py-4 font-mono text-sm leading-6">
            <code
              dangerouslySetInnerHTML={{
                __html: highlight(paste.content, paste.language),
              }}
            />
          </pre>
        </div>
      </article>

      <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span>
          Created <LocalTime iso={paste.createdAt} />
        </span>
        {paste.expiresAt && (
          <span>
            · expires <LocalTime iso={paste.expiresAt} />
          </span>
        )}
        <span>
          ·{" "}
          {paste.remainingViews === null
            ? `${paste.views} views`
            : `${paste.remainingViews} read${paste.remainingViews === 1 ? "" : "s"} left`}
        </span>
      </p>
    </Frame>
  );
}
