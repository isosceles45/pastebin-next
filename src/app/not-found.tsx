import Link from "next/link";

import WordMark from "@/components/WordMark";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <Link href="/" className="font-display text-2xl">
          <WordMark />
        </Link>
      </header>
      <div className="rounded-lg border border-line bg-card p-10 text-center">
        <h1 className="font-display text-2xl">Nothing here</h1>
        <p className="mt-2 text-sm text-muted">
          No paste exists at this address.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent underline underline-offset-4">
          Write a new one
        </Link>
      </div>
    </main>
  );
}
