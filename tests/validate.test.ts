import { describe, expect, it } from "vitest";
import { parse } from "../src/parser/parse.js";
import { validateProject } from "../src/validator/validateProject.js";

function validateSource(src: string) {
  const { projects } = parse(src, "t.afx");
  return validateProject(projects, "t.afx");
}

describe("validateProject", () => {
  it("accepts a minimal valid project and builds IR", () => {
    const { ir, diagnostics } = validateSource('project Demo { name: "demo" }');
    expect(diagnostics).toHaveLength(0);
    expect(ir?.name).toBe("demo");
  });

  it("flags a missing project name", () => {
    const { diagnostics } = validateSource("project Demo { }");
    expect(diagnostics.some((d) => d.code === "AFV002")).toBe(true);
  });

  it("flags more than one project block", () => {
    const { diagnostics } = validateSource(
      'project A { name: "a" }\nproject B { name: "b" }',
    );
    expect(diagnostics.some((d) => d.code === "AFV001")).toBe(true);
  });

  it("flags duplicate commands", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" commands { test: "a" test: "b" } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV003")).toBe(true);
  });

  it("flags duplicate agents", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" agent X { tools: [a] } agent X { tools: [b] } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV004")).toBe(true);
  });

  it("flags an unknown workflow reference", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" agent X { tools: [a] workflow: missing } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV005")).toBe(true);
  });

  it("accepts a resolvable workflow reference", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" workflow w { step a } agent X { tools: [a] workflow: w } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV005")).toBe(false);
  });

  it("flags an empty permission glob", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" permissions { filesystem { deny: [""] } } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV006")).toBe(true);
  });

  it("flags an unknown permission key", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" permissions { filesystem { reed: ["src/**"] } } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV007")).toBe(true);
  });

  it("flags duplicate singleton sections", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" rules { a } rules { b } commands { a: "x" } commands { b: "y" } permissions { filesystem { read: ["src/**"] } } permissions { shell { allow: ["pnpm test"] } } }',
    );
    const duplicateSections = diagnostics.filter((d) => d.code === "AFV008");
    expect(duplicateSections).toHaveLength(3);
  });

  it("flags duplicate workflow names", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" workflow w { step a } workflow w { step b } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV009")).toBe(true);
  });

  it("flags malformed known project properties", () => {
    const { diagnostics } = validateSource(
      'project D { name: 1 version: true stack: ["TypeScript", 2] }',
    );
    expect(diagnostics.filter((d) => d.code === "AFV010")).toHaveLength(3);
  });

  it("flags malformed agent and output properties", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" agent Coder { purpose: false tools: [readFile, 1] workflow: [x] } output Summary { include: [changed_files, 1] style: false } }',
    );
    expect(diagnostics.filter((d) => d.code === "AFV010")).toHaveLength(5);
  });

  it("flags duplicate output names", () => {
    const { diagnostics } = validateSource(
      'project D { name: "d" output Summary { include: [changed_files] } output Summary { include: [test_result] } }',
    );
    expect(diagnostics.some((d) => d.code === "AFV011")).toBe(true);
  });
});
