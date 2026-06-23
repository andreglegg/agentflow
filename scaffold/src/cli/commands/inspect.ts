import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatDiagnostic, sortDiagnostics } from "../../diagnostics/types.js";
import { parse } from "../../parser/parse.js";
import { validateProject } from "../../validator/validateProject.js";
import { findProjectRoot, SOURCE_REL } from "../../fs/projectRoot.js";

export interface InspectOptions {
  cwd?: string;
  ast?: boolean;
}

export function runInspect(options: InspectOptions = {}): number {
  const root = findProjectRoot(options.cwd ?? process.cwd());
  const sourceRel = SOURCE_REL.split("\\").join("/");
  let source: string;
  try {
    source = readFileSync(join(root, SOURCE_REL), "utf8");
  } catch {
    console.error(`Cannot read ${sourceRel}. Run \`agentflow init\` first.`);
    return 1;
  }

  const { projects, diagnostics: parseDiagnostics } = parse(source, sourceRel);
  if (parseDiagnostics.length > 0) {
    for (const d of sortDiagnostics(parseDiagnostics)) console.error(formatDiagnostic(d));
    return 1;
  }

  if (options.ast) {
    console.log(JSON.stringify(projects, null, 2));
    return 0;
  }

  const { ir, diagnostics } = validateProject(projects, sourceRel);
  if (ir === null) {
    for (const d of sortDiagnostics(diagnostics)) console.error(formatDiagnostic(d));
    return 1;
  }
  console.log(JSON.stringify(ir, null, 2));
  return 0;
}
