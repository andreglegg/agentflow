import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatDiagnostic, sortDiagnostics } from "../../diagnostics/types.js";
import { BUILD_INFO_REL, compileProject } from "../../compiler/compileProject.js";
import { stripBuiltAt } from "../../emitters/buildInfo.js";
import { findProjectRoot } from "../../fs/projectRoot.js";

export interface CheckOptions {
  cwd?: string;
}

const BUILD_INFO_POSIX = BUILD_INFO_REL.split("\\").join("/");

export function runCheck(options: CheckOptions = {}): number {
  const root = findProjectRoot(options.cwd ?? process.cwd());
  const result = compileProject({ rootDir: root });

  if (!result.ok) {
    for (const d of sortDiagnostics(result.diagnostics)) {
      console.error(formatDiagnostic(d));
    }
    console.error("\nCheck failed: source does not compile.");
    return 1;
  }

  const stale: string[] = [];
  for (const file of result.files) {
    const abs = join(root, file.path);
    let onDisk: string;
    try {
      onDisk = readFileSync(abs, "utf8");
    } catch {
      stale.push(`${file.path} (missing)`);
      continue;
    }
    const isBuildInfo = file.path.split("\\").join("/") === BUILD_INFO_POSIX;
    const expected = isBuildInfo ? stripBuiltAt(file.content) : file.content;
    const actual = isBuildInfo ? stripBuiltAt(onDisk) : onDisk;
    if (expected !== actual) stale.push(file.path);
  }

  if (stale.length > 0) {
    console.error("Generated files are stale:\n");
    for (const s of stale) console.error(`- ${s}`);
    console.error("\nRun `agentflow build` to update them.");
    return 1;
  }

  console.log("Generated files are up to date.");
  return 0;
}
