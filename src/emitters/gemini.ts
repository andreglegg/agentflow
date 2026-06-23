import type { AgentFlowProjectIR } from "../ir/types.js";
import { bullets, capitalize, includeLabel, inlineCode } from "../util/format.js";
import { markdownHeader } from "./header.js";

export function emitGemini(ir: AgentFlowProjectIR): string {
  const out: string[] = [];
  out.push(markdownHeader(ir.source));
  out.push("");
  out.push("# Gemini Project Context");
  out.push("");

  out.push("## Project");
  out.push("");
  out.push(`Name: ${ir.name}`);
  if (ir.stack.length > 0) {
    out.push("");
    out.push(`This project uses ${joinHuman(ir.stack)}.`);
  }
  out.push("");

  if (ir.rules.length > 0) {
    out.push("## Coding Style");
    out.push("");
    out.push(bullets(ir.rules.map((r) => r.text)));
    out.push("");
  }

  if (ir.commands.length > 0) {
    out.push("## Commands");
    out.push("");
    out.push(
      ir.commands
        .map((c) => `- ${capitalize(c.name)}: ${inlineCode(c.value)}`)
        .join("\n"),
    );
    out.push("");
  }

  const firstWorkflow = Object.entries(ir.workflows).find(
    ([, steps]) => steps.length > 0,
  );
  if (firstWorkflow) {
    out.push("## Workflow");
    out.push("");
    out.push("Use this workflow for code tasks:");
    out.push("");
    out.push(firstWorkflow[1].map((s, idx) => `${idx + 1}. ${s}`).join("\n"));
    out.push("");
  }

  const deny = ir.permissions.filesystem.deny;
  if (deny.length > 0) {
    out.push("## Safety");
    out.push("");
    out.push(
      `Do not access ${deny.map((d) => inlineCode(d)).join(", ")}. Ask before using commands outside the approved command list. These rules are guidance, not enforcement.`,
    );
    out.push("");
  }

  out.push("## Final Response");
  out.push("");
  const include = ir.outputs[0]?.include ?? [];
  const lines =
    include.length > 0
      ? include.map((t) => includeLabel(t).toLowerCase())
      : ["changed files", "commands run", "test result", "any risks"];
  out.push(`Include ${joinHuman(lines)}.`);

  return out.join("\n") + "\n";
}

function joinHuman(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] as string;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
