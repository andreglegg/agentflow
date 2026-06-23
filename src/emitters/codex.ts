import type { AgentFlowProjectIR } from "../ir/types.js";
import {
  bullets,
  capitalize,
  codeBullets,
  includeLabel,
  inlineCode,
} from "../util/format.js";
import { markdownHeader } from "./header.js";

export function emitCodex(ir: AgentFlowProjectIR): string {
  const out: string[] = [];
  out.push(markdownHeader(ir.source));
  out.push("");
  out.push("# Agent Instructions");
  out.push("");

  out.push("## Project");
  out.push("");
  out.push(`Name: ${ir.name}`);
  if (ir.stack.length > 0) {
    out.push("");
    out.push("Stack:");
    out.push("");
    out.push(bullets(ir.stack));
  }
  out.push("");

  if (ir.rules.length > 0) {
    out.push("## Core Rules");
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

  // Only agents that actually declare something get a subsection.
  const agentsWithBody = ir.agents.filter(
    (a) => a.purpose !== undefined || a.tools.length > 0 || a.workflow !== undefined,
  );
  if (agentsWithBody.length > 0) {
    out.push("## Agents");
    out.push("");
    for (const agent of agentsWithBody) {
      out.push(`### ${agent.name}`);
      out.push("");
      if (agent.purpose !== undefined) {
        out.push(`Purpose: ${agent.purpose}`);
        out.push("");
      }
      if (agent.tools.length > 0) {
        out.push(`Tools: ${agent.tools.join(", ")}`);
        out.push("");
      }
      if (agent.workflow !== undefined) {
        out.push(`Workflow: ${agent.workflow}`);
        out.push("");
      }
    }
  }

  for (const [name, steps] of Object.entries(ir.workflows)) {
    if (steps.length === 0) continue;
    out.push(`## Workflow: ${name}`);
    out.push("");
    out.push(steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n"));
    out.push("");
  }

  const fs = ir.permissions.filesystem;
  const sh = ir.permissions.shell;
  const hasPermissions =
    fs.read.length + fs.write.length + fs.deny.length + sh.allow.length + sh.deny.length >
    0;
  if (hasPermissions) {
    out.push("## Permissions Guidance");
    out.push("");
    out.push(
      "Treat these permissions as hard project rules. If the current host tool cannot enforce them, ask before crossing them. (These files are guidance and data, not enforcement.)",
    );
    if (fs.read.length > 0) {
      out.push("");
      out.push("Filesystem read:");
      out.push("");
      out.push(codeBullets(fs.read));
    }
    if (fs.write.length > 0) {
      out.push("");
      out.push("Filesystem write:");
      out.push("");
      out.push(codeBullets(fs.write));
    }
    if (fs.deny.length > 0) {
      out.push("");
      out.push("Filesystem deny:");
      out.push("");
      out.push(codeBullets(fs.deny));
    }
    if (sh.allow.length > 0) {
      out.push("");
      out.push("Allowed shell commands:");
      out.push("");
      out.push(codeBullets(sh.allow));
    }
    if (sh.deny.length > 0) {
      out.push("");
      out.push("Denied shell commands:");
      out.push("");
      out.push(codeBullets(sh.deny));
    }
    out.push("");
  }

  out.push("## Response Format");
  out.push("");
  out.push("When done, include:");
  out.push("");
  const include = ir.outputs[0]?.include ?? [];
  const lines =
    include.length > 0
      ? include.map((t) => includeLabel(t))
      : [
          "What changed",
          "Files changed",
          "Commands run",
          "Test result",
          "Remaining risks",
        ];
  out.push(lines.map((l, idx) => `${idx + 1}. ${l}`).join("\n"));

  return out.join("\n") + "\n";
}
