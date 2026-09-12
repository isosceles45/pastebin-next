import hljs from "highlight.js/lib/common";

export function highlight(content: string, language: string | null): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(content, { language, ignoreIllegals: true }).value;
  }

  return escapeHtml(content);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
