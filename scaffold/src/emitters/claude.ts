import type { AgentFlowProjectIR } from "../ir/types.js";
import { bullets, includeLabel, inlineCode } from "../util/format.js";
import { markdownHeader } from "./header.js";

export interface ClaudeEmitOptions {
  /**
   * When true, emit a thin CLAUDE.md that imports AGENTS.md (Claude Code
   * supports `@path` imports) instead of duplicating the full instructions.
   */
  importMode?: boolean;
}

export function emitClaude(
  ir: AgentFlowProjectIR,
  options: ClaudeEmitOptions = {},
): string {
  if (options.importMode) {
    return emitClaudeImport(ir);
  }

  const out: string[] = [];
  out.push(markdownHeader(ir.source));
  out.push("");
  out.push("# Claude Code Project Memory");
  out.push("");

  out.push("## Project Context");
  out.push("");
  out.push(`You are working in the \`${ir.name}\` codebase.`);
  if (ir.stack.length > 0) {
    out.push("");
    out.push("Stack:");
    out.push("");
    out.push(bullets(ir.stack));
  }
  out.push("");

  if (ir.rules.length > 0) {
    out.push("## Persistent Instructions");
    out.push("");
    out.push(bullets(ir.rules.map((r) => r.text)));
    out.push("");
  }

  if (ir.commands.length > 0) {
    out.push("## Common Commands");
    out.push("");
    out.push(bullets(ir.commands.map((c) => inlineCode(c.value))));
    out.push("");
  }

  // Summarize the first workflow that actually has steps.
  const firstWorkflow = Object.entries(ir.workflows).find(
    ([, steps]) => steps.length > 0,
  );
  if (firstWorkflow) {
    out.push("## Task Workflow");
    out.push("");
    out.push("For code changes, follow:");
    out.push("");
    out.push(firstWorkflow[1].map((s, idx) => `${idx + 1}. ${s}`).join("\n"));
    out.push("");
  }

  const deny = ir.permissions.filesystem.deny;
  if (deny.length > 0) {
    out.push("## Safety Rules");
    out.push("");
    out.push(
      `Do not read, print, modify, or expose secrets. Do not write to ${deny
        .map((d) => inlineCode(d))
        .join(
          ", ",
        )}. Ask before running commands outside the allowlist. These rules are guidance, not enforcement.`,
    );
    out.push("");
  }

  out.push("## Response Format");
  out.push("");
  out.push("When finished, summarize:");
  out.push("");
  const include = ir.outputs[0]?.include ?? [];
  const lines =
    include.length > 0
      ? include.map((t) => includeLabel(t).toLowerCase())
      : [
          "what changed",
          "files changed",
          "commands run",
          "test result",
          "risks or follow up work",
        ];
  out.push(bullets(lines));

  return out.join("\n") + "\n";
}

function emitClaudeImport(ir: AgentFlowProjectIR): string {
  const out: string[] = [];
  out.push(markdownHeader(ir.source));
  out.push("");
  out.push("# Claude Code Project Memory");
  out.push("");
  out.push("Project instructions are shared with other agents. Import them:");
  out.push("");
  out.push("@AGENTS.md");
  out.push("");
  out.push("## Claude-Specific Notes");
  out.push("");
  out.push(
    "Treat the imported instructions as persistent project memory. Permission lists in AGENTS.md are guidance, not enforcement; ask before crossing them.",
  );
  return out.join("\n") + "\n";
}
