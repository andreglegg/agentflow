import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { formatDiagnostic, sortDiagnostics } from "../../diagnostics/types.js";
import { compileProject } from "../../compiler/compileProject.js";
import { findProjectRoot } from "../../fs/projectRoot.js";

export interface BuildOptions {
  cwd?: string;
  claudeImport?: boolean;
}

export function runBuild(options: BuildOptions = {}): number {
  const root = findProjectRoot(options.cwd ?? process.cwd());
  const result = compileProject({
    rootDir: root,
    claude: options.claudeImport ? { importMode: true } : {},
  });

  if (!result.ok) {
    for (const d of sortDiagnostics(result.diagnostics)) {
      console.error(formatDiagnostic(d));
    }
    console.error("\nBuild failed.");
    return 1;
  }

  for (const file of result.files) {
    const abs = join(root, file.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, file.content, "utf8");
  }

  console.log(`Built ${result.files.length} file(s):`);
  for (const file of result.files) console.log(`  ${file.path}`);
  return 0;
}
