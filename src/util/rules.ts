/** Known named rules mapped to their canonical human-facing wording. */
const KNOWN_RULES: Record<string, string> = {
  use_strict_typescript: "Use strict TypeScript.",
  prefer_small_focused_changes: "Prefer small focused changes.",
  read_before_write: "Read files before editing them.",
  run_tests_when_available: "Run tests when available.",
  output_changed_files: "Report changed files after edits.",
};

/** Turn an unknown named rule identifier into a readable sentence. */
function humanize(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  if (words.length === 0) return name;
  const sentence = words.charAt(0).toUpperCase() + words.slice(1);
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

/** Resolve a named rule identifier to display text. */
export function namedRuleText(name: string): string {
  return KNOWN_RULES[name] ?? humanize(name);
}
