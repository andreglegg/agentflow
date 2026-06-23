/** Capitalize the first letter of a label, e.g. "install" -> "Install". */
export function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/** Map known output-include tokens to readable response-format lines. */
const INCLUDE_LABELS: Record<string, string> = {
  changed_files: "Files changed",
  commands_run: "Commands run",
  test_result: "Test result",
  risks: "Remaining risks",
};

export function includeLabel(token: string): string {
  return INCLUDE_LABELS[token] ?? capitalize(token.replace(/[_-]+/g, " "));
}

/**
 * Wrap a string in a CommonMark-correct inline code span. Picks a backtick
 * fence longer than any run of backticks inside the value, and pads when the
 * value starts/ends with a backtick, so user-supplied values cannot break out
 * of the span.
 */
export function inlineCode(s: string): string {
  const runs = [...s.matchAll(/`+/g)].map((m) => m[0].length);
  const longest = runs.length > 0 ? Math.max(...runs) : 0;
  const fence = "`".repeat(longest + 1);
  const pad = s.startsWith("`") || s.endsWith("`") ? " " : "";
  return `${fence}${pad}${s}${pad}${fence}`;
}

/** Render a markdown bullet list; returns "" for empty input. */
export function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

/** Render a markdown bullet list of inline-code items. */
export function codeBullets(items: string[]): string {
  return items.map((i) => `- ${inlineCode(i)}`).join("\n");
}
