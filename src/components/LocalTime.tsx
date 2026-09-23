"use client";

import { useEffect, useState } from "react";

/**
 * Formats a timestamp in the reader's own timezone. The server renders UTC
 * because that is the only thing it knows; the browser corrects it after mount,
 * which keeps the first paint identical on both sides.
 */
export default function LocalTime({ iso }: { iso: string }) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(new Date(iso).toLocaleString());
  }, [iso]);

  return (
    <time dateTime={iso}>{local ?? `${new Date(iso).toISOString().slice(0, 16)}Z`}</time>
  );
}
