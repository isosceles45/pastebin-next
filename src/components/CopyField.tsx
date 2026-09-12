"use client";

import { useState } from "react";

export default function CopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-line px-3 py-2 text-xs hover:bg-paper"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
