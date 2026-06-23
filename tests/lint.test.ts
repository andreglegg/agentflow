import { describe, expect, it } from "vitest";
import { parse } from "../src/parser/parse.js";
import { validateProject } from "../src/validator/validateProject.js";
import { lintProject } from "../src/lint/lintProject.js";
import type { AgentFlowProjectIR } from "../src/ir/types.js";

function irOf(src: string): AgentFlowProjectIR {
  const { projects } = parse(src, "t.afx");
  const { ir } = validateProject(projects, "t.afx");
  if (!ir) throw new Error("expected IR");
  return ir;
}

describe("lintProject", () => {
  it("AFL001 flags duplicate rules", () => {
    const ir = irOf(
      'project D { name: "d" commands { t: "x" } rules { rule "Run the tests." rule "Run the tests." } }',
    );
    const findings = lintProject(ir);
    expect(findings.some((d) => d.code === "AFL001")).toBe(true);
  });

  it("AFL002 flags directly conflicting rules", () => {
    const ir = irOf(
      'project D { name: "d" commands { t: "x" } rules { rule "Never add comments to code." rule "Always add comments to functions." } }',
    );
    const findings = lintProject(ir);
    expect(findings.some((d) => d.code === "AFL002")).toBe(true);
  });

  it("AFL003 flags a declared-but-empty section", () => {
    const ir = irOf('project D { name: "d" commands { t: "x" } rules {} }');
    const findings = lintProject(ir);
    expect(findings.some((d) => d.code === "AFL003")).toBe(true);
  });

  it("AFL003 does not flag absent (undeclared) sections", () => {
    const ir = irOf('project D { name: "d" commands { t: "x" } rules { ok } }');
    const findings = lintProject(ir);
    expect(findings.some((d) => d.code === "AFL003")).toBe(false);
  });

  it("AFL004 flags content over the context budget", () => {
    const ir = irOf('project D { name: "d" commands { t: "x" } rules { ok } }');
    const findings = lintProject(ir, {
      contextBudget: { maxBytes: 10, maxLines: 1 },
      generated: [{ path: "AGENTS.md", content: "a".repeat(500) }],
    });
    expect(findings.some((d) => d.code === "AFL004")).toBe(true);
  });

  it("produces no findings for a clean project", () => {
    const ir = irOf(
      'project D { name: "d" commands { t: "pnpm test" } rules { use_strict_typescript } workflow w { step a } agent X { tools: [readFile] workflow: w } output O { include: [changed_files] } }',
    );
    const findings = lintProject(ir);
    expect(findings).toHaveLength(0);
  });

  it("returns findings in stable order", () => {
    const ir = irOf(
      'project D { name: "d" commands { t: "x" } rules { rule "Run the tests." rule "Run the tests." } }',
    );
    const a = lintProject(ir);
    const b = lintProject(ir);
    expect(a).toEqual(b);
  });
});
