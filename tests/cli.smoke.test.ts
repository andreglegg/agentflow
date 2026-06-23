import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runInit } from "../src/cli/commands/init.js";
import { runBuild } from "../src/cli/commands/build.js";
import { runCheck } from "../src/cli/commands/check.js";
import { runValidate } from "../src/cli/commands/validate.js";
import { runLint } from "../src/cli/commands/lint.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "agentflow-smoke-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe("cli smoke", () => {
  it("init creates source and builds all targets", () => {
    expect(runInit({ cwd: dir, force: true })).toBe(0);
    expect(existsSync(join(dir, ".agent/src/project.afx"))).toBe(true);
    for (const f of [
      "AGENTS.md",
      "CLAUDE.md",
      "GEMINI.md",
      ".agent/dist/manifest.json",
      ".agent/dist/policy.json",
      ".agent/dist/build-info.json",
    ]) {
      expect(existsSync(join(dir, f)), `${f} should exist`).toBe(true);
    }
  });

  it("init without --force does not overwrite", () => {
    expect(runInit({ cwd: dir })).toBe(1);
  });

  it("check passes right after build", () => {
    expect(runBuild({ cwd: dir })).toBe(0);
    expect(runCheck({ cwd: dir })).toBe(0);
  });

  it("check fails when a generated file is edited", () => {
    const agents = join(dir, "AGENTS.md");
    writeFileSync(agents, readFileSync(agents, "utf8") + "\nhand edit\n", "utf8");
    expect(runCheck({ cwd: dir })).toBe(1);
    expect(runBuild({ cwd: dir })).toBe(0); // rebuild restores
    expect(runCheck({ cwd: dir })).toBe(0);
  });

  it("check fails when source changes after build", () => {
    expect(runBuild({ cwd: dir })).toBe(0);
    expect(runCheck({ cwd: dir })).toBe(0);
    const source = join(dir, ".agent/src/project.afx");
    writeFileSync(
      source,
      readFileSync(source, "utf8").replace('name: "my-project"', 'name: "changed"'),
      "utf8",
    );
    expect(runCheck({ cwd: dir })).toBe(1);
    expect(runBuild({ cwd: dir })).toBe(0);
    expect(runCheck({ cwd: dir })).toBe(0);
  });

  it("validate and lint pass on the default project", () => {
    expect(runValidate({ cwd: dir })).toBe(0);
    expect(runLint({ cwd: dir })).toBe(0);
    expect(runLint({ cwd: dir, strict: true })).toBe(0);
  });
});

describe("lint config (agentflow.config.json)", () => {
  let cdir: string;
  const configPath = () => join(cdir, "agentflow.config.json");

  beforeAll(() => {
    cdir = mkdtempSync(join(tmpdir(), "agentflow-cfg-"));
    mkdirSync(join(cdir, ".agent/src"), { recursive: true });
    writeFileSync(
      join(cdir, ".agent/src/project.afx"),
      'project D { name: "d" commands { t: "x" } rules { rule "Run the tests." rule "Run the tests." } }',
      "utf8",
    );
  });

  afterAll(() => rmSync(cdir, { recursive: true, force: true }));

  it("reports the AFL001 finding but exits 0 without strict", () => {
    rmSync(configPath(), { force: true });
    expect(runLint({ cwd: cdir })).toBe(0);
  });

  it("strict via config exits nonzero", () => {
    writeFileSync(configPath(), JSON.stringify({ lint: { strict: true } }), "utf8");
    expect(runLint({ cwd: cdir })).toBe(1);
  });

  it("a rule set to off is suppressed even under strict", () => {
    writeFileSync(
      configPath(),
      JSON.stringify({ lint: { strict: true, rules: { AFL001: "off" } } }),
      "utf8",
    );
    expect(runLint({ cwd: cdir })).toBe(0);
  });
});
