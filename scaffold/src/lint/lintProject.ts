import type { Diagnostic } from "../diagnostics/types.js";
import type { AgentFlowProjectIR } from "../ir/types.js";

export interface ContextBudget {
  maxBytes: number;
  maxLines: number;
}

export interface LintOptions {
  contextBudget?: ContextBudget;
  /** Generated target files to measure for the context-budget rule. */
  generated?: { path: string; content: string }[];
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxBytes: 12000,
  maxLines: 400,
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "for",
  "with",
  "do",
  "not",
  "never",
  "always",
  "must",
  "should",
  "code",
  "rule",
  "your",
  "you",
  "it",
  "is",
  "be",
  "add",
  "use",
]);

function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function negates(text: string): boolean {
  return /\b(never|do not|don't|avoid|no)\b/.test(text.toLowerCase());
}

function asserts(text: string): boolean {
  return /\b(always|must|prefer|ensure|add)\b/.test(text.toLowerCase());
}

export function lintProject(
  ir: AgentFlowProjectIR,
  options: LintOptions = {},
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const file = ir.source;

  // AFL001 Duplicate rules
  const seen = new Set<string>();
  for (const rule of ir.rules) {
    const key = rule.text.trim().toLowerCase();
    if (seen.has(key)) {
      diagnostics.push({
        severity: "warning",
        code: "AFL001",
        message: `Duplicate rule: ${JSON.stringify(rule.text)} repeats an earlier rule.`,
        file,
        ...(rule.line !== undefined ? { line: rule.line } : {}),
        ...(rule.column !== undefined ? { column: rule.column } : {}),
        hint: "Remove one of the rules or merge them into a single rule.",
      });
    } else {
      seen.add(key);
    }
  }

  // AFL002 Directly conflicting rules (conservative never/always heuristic)
  for (let i = 0; i < ir.rules.length; i++) {
    for (let j = i + 1; j < ir.rules.length; j++) {
      const a = ir.rules[i]!;
      const b = ir.rules[j]!;
      const aNeg = negates(a.text);
      const bNeg = negates(b.text);
      const aPos = asserts(a.text);
      const bPos = asserts(b.text);
      const opposed = (aNeg && bPos) || (aPos && bNeg);
      if (!opposed) continue;
      const shared = [...significantTokens(a.text)].filter((t) =>
        significantTokens(b.text).has(t),
      );
      if (shared.length > 0) {
        diagnostics.push({
          severity: "warning",
          code: "AFL002",
          message: `Rule ${JSON.stringify(b.text)} may directly conflict with ${JSON.stringify(a.text)} (shared subject: ${shared.join(", ")}).`,
          file,
          ...(b.line !== undefined ? { line: b.line } : {}),
          ...(b.column !== undefined ? { column: b.column } : {}),
          hint: "Keep one directive on this subject, or scope each rule so they no longer overlap.",
        });
      }
    }
  }

  // AFL003 Empty sections (only when the block was actually declared)
  if (ir.rulesDeclared && ir.rules.length === 0) {
    diagnostics.push(emptySection(file, "rules"));
  }
  if (ir.commandsDeclared && ir.commands.length === 0) {
    diagnostics.push(emptySection(file, "commands"));
  }
  for (const [name, steps] of Object.entries(ir.workflows)) {
    if (steps.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "AFL003",
        message: `Empty workflow ${JSON.stringify(name)} has no steps.`,
        file,
        hint: "Add `step` entries or remove the workflow.",
      });
    }
  }
  for (const agent of ir.agents) {
    if (agent.tools.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "AFL003",
        message: `Agent ${JSON.stringify(agent.name)} declares no tools.`,
        file,
        hint: "Give the agent at least one tool or remove it.",
      });
    }
  }
  for (const output of ir.outputs) {
    if (output.include.length === 0) {
      diagnostics.push({
        severity: "warning",
        code: "AFL003",
        message: `Output ${JSON.stringify(output.name)} has an empty include list.`,
        file,
        hint: "List the fields to include or remove the output.",
      });
    }
  }

  // AFL004 Context-budget warning
  const budget = options.contextBudget ?? DEFAULT_CONTEXT_BUDGET;
  for (const gen of options.generated ?? []) {
    const bytes = Buffer.byteLength(gen.content, "utf8");
    const lines = gen.content.split("\n").length;
    if (bytes > budget.maxBytes) {
      diagnostics.push({
        severity: "warning",
        code: "AFL004",
        message: `Generated markdown ${gen.path} is ${bytes} bytes (budget ${budget.maxBytes}).`,
        file: gen.path,
        line: 1,
        column: 1,
        hint: "Trim or split rules, or raise lint.contextBudget.maxBytes in config.",
      });
    } else if (lines > budget.maxLines) {
      diagnostics.push({
        severity: "warning",
        code: "AFL004",
        message: `Generated markdown ${gen.path} is ${lines} lines (budget ${budget.maxLines}).`,
        file: gen.path,
        line: 1,
        column: 1,
        hint: "Trim or split rules, or raise lint.contextBudget.maxLines in config.",
      });
    }
  }

  return diagnostics;
}

function emptySection(file: string, name: string): Diagnostic {
  return {
    severity: "warning",
    code: "AFL003",
    message: `Empty section ${JSON.stringify(name)}.`,
    file,
    hint: `Add at least one entry or remove the empty \`${name} { }\` block.`,
  };
}
