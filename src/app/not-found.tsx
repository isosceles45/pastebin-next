import Link from "next/link";

import WordMark from "@/components/WordMark";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <Link href="/" className="font-display text-xl sm:text-2xl">
          <WordMark />
        </Link>
      </header>
      <div className="rounded-lg border border-line bg-card p-8 text-center sm:p-10">
        <h1 className="font-display text-xl sm:text-2xl">Nothing here</h1>
        <p className="mt-2 text-sm text-muted">
          No paste exists at this address.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-accent underline underline-offset-4"
        >
          Write a new one
        </Link>
      </div>
    </main>
  );
}
