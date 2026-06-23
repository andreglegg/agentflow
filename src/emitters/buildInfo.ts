import { createHash } from "node:crypto";
import { jsonProvenance } from "./header.js";
import { stableJson } from "./json.js";

export const AGENTFLOW_VERSION = "0.1.0";

export function sha256(content: string): string {
  return "sha256:" + createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Normalize source before hashing so `sourceHash` is invariant to checkout
 * line-ending policy (autocrlf) and a leading BOM. Safe because the tokenizer
 * already ignores `\r`, so parse/IR/output behavior is unaffected.
 */
function normalizeSource(content: string): string {
  return content.replace(/^﻿/, "").replace(/\r\n/g, "\n");
}

export interface BuildInfoInput {
  source: string;
  sourceContent: string;
  /** Map of output relative path -> content (excluding build-info.json itself). */
  outputs: Record<string, string>;
  /** ISO timestamp; excluded from `check` comparisons. */
  builtAt: string;
}

export function emitBuildInfo(input: BuildInfoInput): string {
  const outputHashes: Record<string, string> = {};
  for (const key of Object.keys(input.outputs).sort()) {
    outputHashes[key] = sha256(input.outputs[key] as string);
  }
  const info = {
    ...jsonProvenance(input.source),
    agentflowVersion: AGENTFLOW_VERSION,
    sourceHash: sha256(normalizeSource(input.sourceContent)),
    builtAt: input.builtAt,
    outputs: outputHashes,
  };
  return stableJson(info);
}

/** Strip the volatile `builtAt` field so `check` can compare build-info deterministically. */
export function stripBuiltAt(buildInfoJson: string): string {
  try {
    const parsed = JSON.parse(buildInfoJson) as Record<string, unknown>;
    delete parsed.builtAt;
    return stableJson(parsed);
  } catch {
    return buildInfoJson;
  }
}
