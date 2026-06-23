export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  hint?: string;
}

/** Format a diagnostic in the canonical `file:line:col severity CODE message` style. */
export function formatDiagnostic(d: Diagnostic): string {
  const loc =
    d.file !== undefined && d.line !== undefined && d.column !== undefined
      ? `${d.file}:${d.line}:${d.column} `
      : d.file !== undefined
        ? `${d.file} `
        : "";
  const head = `${loc}${d.severity} ${d.code} ${d.message}`;
  return d.hint ? `${head}\nHint: ${d.hint}` : head;
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === "error");
}

/** Stable ordering: file, then line, then column, then code. */
export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const af = a.file ?? "";
    const bf = b.file ?? "";
    if (af !== bf) return af < bf ? -1 : 1;
    const al = a.line ?? 0;
    const bl = b.line ?? 0;
    if (al !== bl) return al - bl;
    const ac = a.column ?? 0;
    const bc = b.column ?? 0;
    if (ac !== bc) return ac - bc;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
}
