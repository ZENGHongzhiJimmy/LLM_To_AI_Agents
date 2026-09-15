function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PATTERN =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(False|None|True)\b|\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b|-?\b\d+(?:\.\d+)?\b/g;

export function highlightPython(source: string) {
  let last = 0;
  let html = "";
  for (const match of source.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(last, index));
    const [full, comment, string, constant, keyword] = match;
    if (comment) {
      html += `<span class="text-muted-foreground">${escapeHtml(full)}</span>`;
    } else if (string) {
      html += `<span class="text-emerald-700">${escapeHtml(full)}</span>`;
    } else if (constant) {
      html += `<span class="text-rose-700">${escapeHtml(full)}</span>`;
    } else if (keyword) {
      html += `<span class="text-indigo-800 font-medium">${escapeHtml(full)}</span>`;
    } else {
      html += `<span class="text-amber-700">${escapeHtml(full)}</span>`;
    }
    last = index + full.length;
  }
  html += escapeHtml(source.slice(last));
  return html || " ";
}

export function looksLikePython(source: string) {
  const trimmed = source.trim();
  return /^(from |import |def |class |print\(|completion =|client =|TOOL_SCHEMAS =)/m.test(
    trimmed
  );
}
