import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatDiagnostic, hasErrors, sortDiagnostics } from "../../diagnostics/types.js";
import { parse } from "../../parser/parse.js";
import { validateProject } from "../../validator/validateProject.js";
import { findProjectRoot, SOURCE_REL } from "../../fs/projectRoot.js";

export interface ValidateOptions {
  cwd?: string;
}

export function runValidate(options: ValidateOptions = {}): number {
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
  const all = [...parseDiagnostics];
  if (parseDiagnostics.length === 0) {
    const { diagnostics } = validateProject(projects, sourceRel);
    all.push(...diagnostics);
  }

  if (all.length === 0) {
    console.log("No problems found.");
    return 0;
  }

  for (const d of sortDiagnostics(all)) console.error(formatDiagnostic(d));
  return hasErrors(all) ? 1 : 0;
}
