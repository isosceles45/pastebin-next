"use client";

import { useEffect, useState } from "react";

const WORDS = ["Pastebin", "notes.txt", "config.yml", "error.log"];

type Phase = "idle" | "selecting" | "selected" | "copied" | "pasted";

const STEPS: [Phase, number][] = [
  ["idle", 3400],
  ["selecting", 1600],
  ["selected", 1200],
  ["copied", 600],
  ["selected", 700],
  ["pasted", 1400],
];

export default function WordMark({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const advance = () => {
      const [next, duration] = STEPS[step];

      setPhase(next);
      if (next === "pasted")
        setIndex((current) => (current + 1) % WORDS.length);

      timer = setTimeout(() => {
        step = (step + 1) % STEPS.length;
        advance();
      }, duration);
    };

    advance();
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={`wordmark wordmark-${phase} ${className}`}>
      <span className="wordmark-selection" aria-hidden />
      <span className="wordmark-text">{WORDS[index]}</span>
      <span className="wordmark-caret" aria-hidden />
    </span>
  );
}
