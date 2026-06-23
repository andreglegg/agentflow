import type { AgentFlowProjectIR } from "../ir/types.js";
import { jsonProvenance } from "./header.js";
import { stableJson } from "./json.js";

export function emitPolicy(ir: AgentFlowProjectIR): string {
  const policy = {
    ...jsonProvenance(ir.source),
    filesystem: {
      read: ir.permissions.filesystem.read,
      write: ir.permissions.filesystem.write,
      deny: ir.permissions.filesystem.deny,
    },
    shell: {
      allow: ir.permissions.shell.allow,
      deny: ir.permissions.shell.deny,
    },
  };
  return stableJson(policy);
}
