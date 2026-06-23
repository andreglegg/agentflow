import { stableJson } from "./json.js";

/** JSON Schema describing the generated manifest.json (our own output). */
export function emitManifestSchema(): string {
  const schema = {
    $schema: "https://json-schema.org/draft-07/schema#",
    $id: "https://agentflow.dev/schemas/manifest.schema.json",
    title: "AgentFlow Manifest",
    type: "object",
    required: ["schemaVersion", "project", "commands", "workflows", "agents"],
    properties: {
      schemaVersion: { type: "string" },
      project: {
        type: "object",
        required: ["name", "stack"],
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          stack: { type: "array", items: { type: "string" } },
        },
      },
      commands: { type: "object", additionalProperties: { type: "string" } },
      workflows: {
        type: "object",
        additionalProperties: { type: "array", items: { type: "string" } },
      },
      agents: {
        type: "object",
        additionalProperties: {
          type: "object",
          required: ["tools"],
          properties: {
            purpose: { type: "string" },
            tools: { type: "array", items: { type: "string" } },
            workflow: { type: "string" },
          },
        },
      },
      outputs: {
        type: "object",
        additionalProperties: {
          type: "object",
          required: ["include"],
          properties: {
            include: { type: "array", items: { type: "string" } },
            style: { type: "string" },
          },
        },
      },
    },
  };
  return stableJson(schema);
}

/** JSON Schema describing the generated policy.json (our own output). */
export function emitPolicySchema(): string {
  const globList = { type: "array", items: { type: "string" } };
  const schema = {
    $schema: "https://json-schema.org/draft-07/schema#",
    $id: "https://agentflow.dev/schemas/policy.schema.json",
    title: "AgentFlow Policy",
    type: "object",
    required: ["filesystem", "shell"],
    properties: {
      filesystem: {
        type: "object",
        required: ["read", "write", "deny"],
        properties: { read: globList, write: globList, deny: globList },
      },
      shell: {
        type: "object",
        required: ["allow", "deny"],
        properties: { allow: globList, deny: globList },
      },
    },
  };
  return stableJson(schema);
}
