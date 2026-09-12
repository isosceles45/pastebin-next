export default function WordMark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="wordmark-selection" aria-hidden />
      <span className="wordmark-text">Pastebin</span>
      <span className="wordmark-caret" aria-hidden />
    </span>
  );
}
