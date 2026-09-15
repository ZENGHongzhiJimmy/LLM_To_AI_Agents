function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PATTERN = /(^|\n)(#{1,6}[^\n]*)|(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g;

export function highlightMarkdown(source: string) {
  let last = 0;
  let html = "";
  for (const match of source.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(last, index));
    const [full, newline, heading, placeholder] = match;
    if (heading) {
      html += `${escapeHtml(newline ?? "")}<span class="text-indigo-800 font-medium">${escapeHtml(heading)}</span>`;
    } else if (placeholder) {
      html += `<span class="text-emerald-700">${escapeHtml(placeholder)}</span>`;
    } else {
      html += escapeHtml(full);
    }
    last = index + full.length;
  }
  html += escapeHtml(source.slice(last));
  return html || " ";
}
