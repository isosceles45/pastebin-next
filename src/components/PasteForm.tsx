"use client";

import { useRef, useState } from "react";

import CopyField from "@/components/CopyField";
import { languageFromFilename, LANGUAGES } from "@/lib/languages";

const MAX_BYTES = 512 * 1024;

const EXPIRY_CHOICES = [
  { label: "never", value: "" },
  { label: "10 min", value: "10m" },
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

const URL_STYLES = [
  { label: "short", hint: "8 characters" },
  { label: "long", hint: "22 characters, harder to guess" },
  { label: "custom", hint: "choose your own" },
];

const field =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink";

const sectionLabel = "mb-2 block text-xs tracking-wide text-muted uppercase";

const chip = (active: boolean) =>
  active
    ? "rounded-md bg-ink px-3 py-1.5 text-xs text-paper"
    : "rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-ink";

type Created = {
  url: string;
  rawUrl: string;
  manageUrl: string;
  expiresAt: string | null;
  maxViews: number | null;
};

export default function PasteForm() {
  const [tab, setTab] = useState<"write" | "file">("write");
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const [language, setLanguage] = useState("plain text");
  const [expiresIn, setExpiresIn] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [password, setPassword] = useState("");
  const [urlStyle, setUrlStyle] = useState("short");
  const [customId, setCustomId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const byteSize = new Blob([content]).size;

  async function loadFile(file: File) {
    if (file.size > MAX_BYTES) {
      setError(`${file.name} is larger than 512 KB`);
      return;
    }

    setError(null);
    setContent(await file.text());
    setFilename(file.name);
    setLanguage(languageFromFilename(file.name) ?? "plain text");
    setTab("write");
  }

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
          filename: filename || undefined,
          language: language === "plain text" ? undefined : language,
          expiresIn: expiresIn || undefined,
          maxViews: maxViews || undefined,
          password: password || undefined,
          idStyle: urlStyle === "long" ? "long" : undefined,
          customId: urlStyle === "custom" ? customId : undefined,
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
      <section className="mx-auto max-w-2xl space-y-5 rounded-xl border border-line bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl">Your paste is live</h2>

        <CopyField label="Share this" value={created.url} />
        <CopyField label="Plain text" value={created.rawUrl} />
        <CopyField label="Manage (keep private)" value={created.manageUrl} />

        <p className="text-sm text-muted">
          {created.expiresAt
            ? `Expires ${new Date(created.expiresAt).toLocaleString()}.`
            : "It will not expire on its own."}{" "}
          {created.maxViews
            ? `It can be read ${created.maxViews} time${created.maxViews === 1 ? "" : "s"}.`
            : "Unlimited reads."}{" "}
          The manage link is shown only now — it is the only way to edit or delete this paste.
        </p>

        <div className="flex gap-3">
          <a href={created.url} className="rounded-md bg-ink px-4 py-2 text-sm text-paper">
            Open it
          </a>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setContent("");
              setFilename("");
              setPassword("");
              setCustomId("");
            }}
            className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-ink"
          >
            Write another
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
          <div className="flex items-center gap-5 px-5 pt-4 text-sm">
            {(["write", "file"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={
                  tab === name
                    ? "border-b-2 border-accent pb-2 text-ink"
                    : "border-b-2 border-transparent pb-2 text-muted hover:text-ink"
                }
              >
                {name === "write" ? "Write" : "Upload a file"}
              </button>
            ))}
          </div>

          {tab === "write" ? (
            <>
              <div className="flex items-center gap-3 border-y border-line px-4 py-2">
                <input
                  value={filename}
                  onChange={(event) => {
                    setFilename(event.target.value);
                    const guess = languageFromFilename(event.target.value);
                    if (guess) setLanguage(guess);
                  }}
                  placeholder="File name (optional)"
                  className="min-w-0 flex-1 bg-transparent py-1 font-mono text-sm outline-none"
                />
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="shrink-0 bg-transparent py-1 text-xs text-muted outline-none"
                >
                  {LANGUAGES.map((name) => (
                    <option key={name} value={name} className="bg-card">
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste your text here"
                rows={20}
                spellCheck={false}
                className="w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-6 outline-none"
              />

              <p className="border-t border-line px-4 py-2 text-right text-xs text-muted">
                {byteSize.toLocaleString()} / {(MAX_BYTES / 1024).toLocaleString()} KB
              </p>
            </>
          ) : (
            <div className="p-5">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files[0];
                  if (file) loadFile(file);
                }}
                onClick={() => fileInput.current?.click()}
                className="cursor-pointer rounded-lg border border-dashed border-line px-6 py-20 text-center hover:border-ink"
              >
                <p className="text-sm">Drop a text file here, or click to choose one</p>
                <p className="mt-1 text-xs text-muted">Up to 512 KB</p>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) loadFile(file);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 p-5">
          <div>
            <span className={sectionLabel}>Expires</span>
            <div className="flex flex-wrap gap-1.5">
              {EXPIRY_CHOICES.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => setExpiresIn(choice.value)}
                  className={chip(expiresIn === choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <div>
              <label htmlFor="maxViews" className={sectionLabel}>
                Max reads
              </label>
              <input
                id="maxViews"
                inputMode="numeric"
                value={maxViews}
                onChange={(event) => setMaxViews(event.target.value.replace(/\D/g, ""))}
                placeholder="unlimited"
                className={field}
              />
            </div>

            <div>
              <label htmlFor="password" className={sectionLabel}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="none"
                className={field}
              />
            </div>
          </div>

          <div>
            <span className={sectionLabel}>Link style</span>
            <div className="flex flex-wrap gap-1.5">
              {URL_STYLES.map((style) => (
                <button
                  key={style.label}
                  type="button"
                  title={style.hint}
                  onClick={() => setUrlStyle(style.label)}
                  className={chip(urlStyle === style.label)}
                >
                  {style.label}
                </button>
              ))}
            </div>
            {urlStyle === "custom" && (
              <input
                value={customId}
                onChange={(event) => setCustomId(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
                placeholder="my-notes"
                className={`${field} mt-2 font-mono`}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving || content.length === 0}
            className="w-full rounded-md bg-ink py-2.5 text-sm text-paper disabled:opacity-30"
          >
            {saving ? "Saving…" : "Create link"}
          </button>
        </aside>
      </div>
    </form>
  );
}
