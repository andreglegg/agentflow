import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Diagnostic } from "../diagnostics/types.js";

export type RuleSeverity = "warn" | "error" | "off";

export interface AgentflowLintConfig {
  strict?: boolean;
  rules?: Record<string, RuleSeverity>;
  contextBudget?: { maxBytes?: number; maxLines?: number };
}

export interface AgentflowConfig {
  lint?: AgentflowLintConfig;
}

export interface LoadConfigResult {
  config: AgentflowConfig;
  diagnostics: Diagnostic[];
}

export const CONFIG_FILENAME = "agentflow.config.json";

/** Load and validate `<rootDir>/agentflow.config.json`. The file is optional. */
export function loadConfig(rootDir: string): LoadConfigResult {
  const path = join(rootDir, CONFIG_FILENAME);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { config: {}, diagnostics: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      config: {},
      diagnostics: [
        {
          severity: "error",
          code: "AFC002",
          message: `Invalid JSON in ${CONFIG_FILENAME}: ${
            err instanceof Error ? err.message : String(err)
          }`,
          file: CONFIG_FILENAME,
          hint: "Fix the JSON syntax or remove the config file.",
        },
      ],
    };
  }

  return validateConfig(parsed);
}

function warn(message: string): Diagnostic {
  return { severity: "warning", code: "AFC003", message, file: CONFIG_FILENAME };
}

function validateConfig(parsed: unknown): LoadConfigResult {
  const diagnostics: Diagnostic[] = [];
  const config: AgentflowConfig = {};

  if (typeof parsed !== "object" || parsed === null) {
    diagnostics.push(warn("Config root must be an object."));
    return { config, diagnostics };
  }

  const root = parsed as Record<string, unknown>;
  const lintRaw = root.lint;
  if (lintRaw === undefined) return { config, diagnostics };

  if (typeof lintRaw !== "object" || lintRaw === null) {
    diagnostics.push(warn('"lint" must be an object.'));
    return { config, diagnostics };
  }

  const l = lintRaw as Record<string, unknown>;
  const lint: AgentflowLintConfig = {};

  if (typeof l.strict === "boolean") lint.strict = l.strict;
  else if (l.strict !== undefined)
    diagnostics.push(warn('"lint.strict" must be a boolean.'));

  if (l.rules !== undefined) {
    if (typeof l.rules === "object" && l.rules !== null) {
      const rules: Record<string, RuleSeverity> = {};
      for (const [k, v] of Object.entries(l.rules as Record<string, unknown>)) {
        if (v === "warn" || v === "error" || v === "off") rules[k] = v;
        else
          diagnostics.push(warn(`"lint.rules.${k}" must be "warn", "error", or "off".`));
      }
      lint.rules = rules;
    } else {
      diagnostics.push(warn('"lint.rules" must be an object.'));
    }
  }

  if (l.contextBudget !== undefined) {
    if (typeof l.contextBudget === "object" && l.contextBudget !== null) {
      const cb = l.contextBudget as Record<string, unknown>;
      const budget: { maxBytes?: number; maxLines?: number } = {};
      if (typeof cb.maxBytes === "number") budget.maxBytes = cb.maxBytes;
      else if (cb.maxBytes !== undefined)
        diagnostics.push(warn('"lint.contextBudget.maxBytes" must be a number.'));
      if (typeof cb.maxLines === "number") budget.maxLines = cb.maxLines;
      else if (cb.maxLines !== undefined)
        diagnostics.push(warn('"lint.contextBudget.maxLines" must be a number.'));
      lint.contextBudget = budget;
    } else {
      diagnostics.push(warn('"lint.contextBudget" must be an object.'));
    }
  }

  config.lint = lint;
  return { config, diagnostics };
}
