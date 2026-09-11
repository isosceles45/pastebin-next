"use client";

import { useState } from "react";

type Created = { id: string; url: string; expiresAt: string | null; maxViews: number | null };

const EXPIRY_CHOICES = [
  { label: "never", value: "" },
  { label: "10 min", value: "10m" },
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
];

export default function PasteForm() {
  const [content, setContent] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          expiresIn: expiresIn || undefined,
          maxViews: maxViews || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "could not save the paste");

      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-lg border border-line bg-card p-6">
        <h2 className="font-display text-xl">Saved</h2>

        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={created.url}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(created.url)}
            className="rounded-md border border-line px-3 py-2 text-sm hover:bg-paper"
          >
            Copy
          </button>
        </div>

        <p className="mt-3 text-sm text-muted">
          {created.expiresAt
            ? `Expires ${new Date(created.expiresAt).toLocaleString()}.`
            : "No expiry date."}{" "}
          {created.maxViews
            ? `Readable ${created.maxViews} time${created.maxViews === 1 ? "" : "s"}.`
            : "Unlimited views."}
        </p>

        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setContent("");
          }}
          className="mt-5 text-sm text-accent underline underline-offset-4"
        >
          Write another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-card p-6">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Paste your text here"
        rows={12}
        spellCheck={false}
        className="w-full resize-y rounded-md border border-line bg-paper p-3 font-mono text-sm outline-none focus:border-ink"
      />

      <div className="mt-5 flex flex-wrap items-end gap-6 border-t border-line pt-5">
        <div>
          <span className="mb-2 block text-xs tracking-wide text-muted uppercase">Expires</span>
          <div className="flex flex-wrap gap-1">
            {EXPIRY_CHOICES.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => setExpiresIn(choice.value)}
                className={
                  expiresIn === choice.value
                    ? "rounded-md bg-ink px-2.5 py-1.5 text-xs text-paper"
                    : "rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-paper"
                }
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="maxViews"
            className="mb-2 block text-xs tracking-wide text-muted uppercase"
          >
            Max views
          </label>
          <input
            id="maxViews"
            inputMode="numeric"
            value={maxViews}
            onChange={(event) => setMaxViews(event.target.value.replace(/\D/g, ""))}
            placeholder="unlimited"
            className="w-28 rounded-md border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink"
          />
        </div>

        <button
          type="submit"
          disabled={saving || content.length === 0}
          className="ml-auto rounded-md bg-ink px-5 py-2 text-sm text-paper disabled:opacity-30"
        >
          {saving ? "Saving…" : "Create link"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-accent">{error}</p>}
    </form>
  );
}
