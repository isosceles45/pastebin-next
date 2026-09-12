"use client";

import { useState } from "react";

export default function PasswordGate({ id }: { id: string }) {
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/pastes/${id}`, {
        headers: { "x-paste-password": password },
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error ?? "could not open the paste");

      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  if (content !== null) {
    return (
      <article className="overflow-hidden rounded-lg border border-line bg-card">
        <div className="border-b border-line px-4 py-2.5 text-xs text-muted">
          <span className="font-mono text-ink">{id}</span> · unlocked
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm leading-6">
          {content}
        </pre>
      </article>
    );
  }

  return (
    <form
      onSubmit={unlock}
      className="mx-auto max-w-sm rounded-lg border border-line bg-card p-6"
    >
      <h1 className="font-display text-xl">This paste is locked</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        Enter the password to read it.
      </p>

      <div className="flex gap-2">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={checking || password.length === 0}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm text-paper disabled:opacity-30"
        >
          {checking ? "…" : "Unlock"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </form>
  );
}
