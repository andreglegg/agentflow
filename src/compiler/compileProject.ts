import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Diagnostic } from "../diagnostics/types.js";
import { hasErrors } from "../diagnostics/types.js";
import type { AgentFlowProjectIR } from "../ir/types.js";
import { parse } from "../parser/parse.js";
import { validateProject } from "../validator/validateProject.js";
import { emitCodex } from "../emitters/codex.js";
import { emitClaude, type ClaudeEmitOptions } from "../emitters/claude.js";
import { emitGemini } from "../emitters/gemini.js";
import { emitManifest } from "../emitters/manifest.js";
import { emitPolicy } from "../emitters/policy.js";
import { emitManifestSchema, emitPolicySchema } from "../emitters/schemas.js";
import { emitBuildInfo } from "../emitters/buildInfo.js";
import { SOURCE_REL } from "../fs/projectRoot.js";

export interface GeneratedFile {
  path: string;
  content: string;
}

export type TargetName =
  | "codex"
  | "claude"
  | "gemini"
  | "manifest"
  | "policy"
  | "schemas"
  | "buildInfo";

export interface CompileInput {
  rootDir: string;
  /** Optional in-memory source; if omitted, read from `<rootDir>/.agent/src/project.afx`. */
  source?: string;
  /** Source path relative to rootDir, used in generated headers. */
  sourceRel?: string;
  /** ISO timestamp for build-info; defaults to env AGENTFLOW_BUILD_TIME or epoch. */
  buildTime?: string;
  claude?: ClaudeEmitOptions;
}

export interface CompileResult {
  ok: boolean;
  files: GeneratedFile[];
  diagnostics: Diagnostic[];
  ir: AgentFlowProjectIR | null;
}

const DIST = join(".agent", "dist");
const BUILD_INFO_PATH = join(DIST, "build-info.json");

export function defaultBuildTime(): string {
  return process.env.AGENTFLOW_BUILD_TIME ?? "1970-01-01T00:00:00.000Z";
}

export function compileProject(input: CompileInput): CompileResult {
  const sourceRel = input.sourceRel ?? SOURCE_REL;
  let sourceContent: string;
  if (input.source !== undefined) {
    sourceContent = input.source;
  } else {
    try {
      sourceContent = readFileSync(join(input.rootDir, sourceRel), "utf8");
    } catch {
      return {
        ok: false,
        files: [],
        ir: null,
        diagnostics: [
          {
            severity: "error",
            code: "AFC001",
            message: `Cannot read source file ${sourceRel}.`,
            file: sourceRel,
            hint: "Run `agentflow init` to create it.",
          },
        ],
      };
    }
  }

  const headerSource = sourceRel.split("\\").join("/");
  const { projects, diagnostics: parseDiagnostics } = parse(sourceContent, headerSource);
  if (parseDiagnostics.length > 0) {
    return { ok: false, files: [], ir: null, diagnostics: parseDiagnostics };
  }

  const { ir, diagnostics: validateDiagnostics } = validateProject(
    projects,
    headerSource,
  );
  if (ir === null || hasErrors(validateDiagnostics)) {
    return { ok: false, files: [], ir, diagnostics: validateDiagnostics };
  }

  // Emit non-build-info targets first, so build-info can hash them.
  const primary: GeneratedFile[] = [
    { path: "AGENTS.md", content: emitCodex(ir) },
    { path: "CLAUDE.md", content: emitClaude(ir, input.claude ?? {}) },
    { path: "GEMINI.md", content: emitGemini(ir) },
    { path: join(DIST, "manifest.json"), content: emitManifest(ir) },
    { path: join(DIST, "policy.json"), content: emitPolicy(ir) },
    {
      path: join(DIST, "schemas", "manifest.schema.json"),
      content: emitManifestSchema(),
    },
    { path: join(DIST, "schemas", "policy.schema.json"), content: emitPolicySchema() },
  ];

  const outputs: Record<string, string> = {};
  for (const f of primary) outputs[toPosix(f.path)] = f.content;

  const buildInfo = emitBuildInfo({
    source: headerSource,
    sourceContent,
    outputs,
    builtAt: input.buildTime ?? defaultBuildTime(),
  });

  const files: GeneratedFile[] = [
    ...primary,
    { path: BUILD_INFO_PATH, content: buildInfo },
  ];

  return { ok: true, files, ir, diagnostics: validateDiagnostics };
}

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

export const BUILD_INFO_REL = BUILD_INFO_PATH;
