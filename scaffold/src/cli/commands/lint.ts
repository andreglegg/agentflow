import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatDiagnostic,
  sortDiagnostics,
  type Diagnostic,
  type Severity,
} from "../../diagnostics/types.js";
import { parse } from "../../parser/parse.js";
import { validateProject } from "../../validator/validateProject.js";
import {
  lintProject,
  DEFAULT_CONTEXT_BUDGET,
  type ContextBudget,
} from "../../lint/lintProject.js";
import { emitCodex } from "../../emitters/codex.js";
import { emitClaude } from "../../emitters/claude.js";
import { emitGemini } from "../../emitters/gemini.js";
import { findProjectRoot, SOURCE_REL } from "../../fs/projectRoot.js";
import { loadConfig } from "../../config/loadConfig.js";

export interface LintOptions {
  cwd?: string;
  strict?: boolean;
}

export function runLint(options: LintOptions = {}): number {
  const root = findProjectRoot(options.cwd ?? process.cwd());
  const sourceRel = SOURCE_REL.split("\\").join("/");
  let source: string;
  try {
    source = readFileSync(join(root, SOURCE_REL), "utf8");
  } catch {
    console.error(`Cannot read ${sourceRel}. Run \`agentflow init\` first.`);
    return 1;
  }

  const { projects, diagnostics: parseDiagnostics } = parse(source, sourceRel);
  if (parseDiagnostics.length > 0) {
    for (const d of sortDiagnostics(parseDiagnostics)) console.error(formatDiagnostic(d));
    console.error("\nLint skipped: source does not parse.");
    return 1;
  }

  const { ir, diagnostics: validateDiagnostics } = validateProject(projects, sourceRel);
  if (ir === null || validateDiagnostics.some((d) => d.severity === "error")) {
    for (const d of sortDiagnostics(validateDiagnostics))
      console.error(formatDiagnostic(d));
    console.error("\nLint skipped: source does not validate.");
    return 1;
  }

  const { config, diagnostics: configDiagnostics } = loadConfig(root);
  for (const d of configDiagnostics) console.error(formatDiagnostic(d));
  const configHasError = configDiagnostics.some((d) => d.severity === "error");

  const lintCfg = config.lint ?? {};
  const contextBudget: ContextBudget = {
    maxBytes: lintCfg.contextBudget?.maxBytes ?? DEFAULT_CONTEXT_BUDGET.maxBytes,
    maxLines: lintCfg.contextBudget?.maxLines ?? DEFAULT_CONTEXT_BUDGET.maxLines,
  };

  const generated = [
    { path: "AGENTS.md", content: emitCodex(ir) },
    { path: "CLAUDE.md", content: emitClaude(ir, {}) },
    { path: "GEMINI.md", content: emitGemini(ir) },
  ];

  const raw = lintProject(ir, { generated, contextBudget });

  // Apply per-rule severity from config (off drops; warn/error relabel), then
  // --strict (CLI flag or config) promotes any remaining warning to an error.
  const strict = options.strict === true || lintCfg.strict === true;
  const findings: Diagnostic[] = [];
  for (const d of raw) {
    const setting = lintCfg.rules?.[d.code];
    if (setting === "off") continue;
    let severity: Severity = d.severity;
    if (setting === "error") severity = "error";
    else if (setting === "warn") severity = "warning";
    if (strict) severity = "error";
    findings.push({ ...d, severity });
  }

  const sorted = sortDiagnostics(findings);

  if (sorted.length === 0) {
    if (!configHasError) console.log("No lint findings.");
    return configHasError ? 1 : 0;
  }

  for (const d of sorted) console.error(formatDiagnostic(d));
  const errorCount = sorted.filter((d) => d.severity === "error").length;
  console.error(
    `\n${sorted.length} lint finding(s)${errorCount > 0 ? ` (${errorCount} error)` : ""}.`,
  );
  return errorCount > 0 || configHasError ? 1 : 0;
}
