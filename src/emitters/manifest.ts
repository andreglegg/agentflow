import type { AgentFlowProjectIR } from "../ir/types.js";
import { jsonProvenance } from "./header.js";
import { stableJson } from "./json.js";

export const MANIFEST_SCHEMA_VERSION = "0.1.0";

export function emitManifest(ir: AgentFlowProjectIR): string {
  const agents: Record<string, unknown> = {};
  for (const agent of ir.agents) {
    agents[agent.name] = orderedAgent(agent.purpose, agent.tools, agent.workflow);
  }

  const commands: Record<string, string> = {};
  for (const c of ir.commands) commands[c.name] = c.value;

  const outputs: Record<string, unknown> = {};
  for (const o of ir.outputs) {
    const entry: Record<string, unknown> = { include: o.include };
    if (o.style !== undefined) entry.style = o.style;
    outputs[o.name] = entry;
  }

  const project: Record<string, unknown> = { name: ir.name };
  if (ir.version !== undefined) project.version = ir.version;
  project.stack = ir.stack;

  const manifest = {
    ...jsonProvenance(ir.source),
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    project,
    commands,
    workflows: ir.workflows,
    agents,
    outputs,
  };

  return stableJson(manifest);
}

function orderedAgent(
  purpose: string | undefined,
  tools: string[],
  workflow: string | undefined,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  if (purpose !== undefined) entry.purpose = purpose;
  entry.tools = tools;
  if (workflow !== undefined) entry.workflow = workflow;
  return entry;
}
