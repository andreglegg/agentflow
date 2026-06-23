import { existsSync } from "node:fs";
import { dirname, join, parse as parsePath } from "node:path";

export const SOURCE_REL = join(".agent", "src", "project.afx");

/**
 * Walk upward from `start` looking for a directory that contains
 * `.agent/src/project.afx`. Falls back to `start` if none is found.
 */
export function findProjectRoot(start: string): string {
  let dir = start;
  const root = parsePath(dir).root;
  for (;;) {
    if (existsSync(join(dir, SOURCE_REL))) return dir;
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function sourcePath(rootDir: string): string {
  return join(rootDir, SOURCE_REL);
}
