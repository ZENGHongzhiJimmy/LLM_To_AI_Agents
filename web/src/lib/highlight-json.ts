function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function highlightJson(source: string) {
  const pattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
  let last = 0;
  let html = "";
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(last, index));
    const [full, string, colon] = match;
    if (colon) {
      html += `<span class="text-indigo-800 font-medium">${escapeHtml(string)}</span>${escapeHtml(colon)}`;
    } else if (string) {
      html += `<span class="text-emerald-700">${escapeHtml(string)}</span>`;
    } else if (match[3]) {
      html += `<span class="text-rose-700">${escapeHtml(full)}</span>`;
    } else {
      html += `<span class="text-amber-700">${escapeHtml(full)}</span>`;
    }
    last = index + full.length;
  }
  html += escapeHtml(source.slice(last));
  return html || " ";
}

export function looksLikeJson(source: string) {
  const trimmed = source.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}
