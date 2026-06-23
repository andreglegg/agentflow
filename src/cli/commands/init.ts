import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SOURCE_REL } from "../../fs/projectRoot.js";
import { DEFAULT_PROJECT_AFX } from "../template.js";
import { runBuild } from "./build.js";

export interface InitOptions {
  cwd?: string;
  force?: boolean;
}

export function runInit(options: InitOptions = {}): number {
  const root = options.cwd ?? process.cwd();
  const sourceAbs = join(root, SOURCE_REL);

  if (existsSync(sourceAbs) && !options.force) {
    console.error(
      `${SOURCE_REL} already exists. Use --force to overwrite, or edit it directly.`,
    );
    return 1;
  }

  mkdirSync(dirname(sourceAbs), { recursive: true });
  writeFileSync(sourceAbs, DEFAULT_PROJECT_AFX, "utf8");
  console.log(`Created ${SOURCE_REL}`);

  return runBuild({ cwd: root });
}
