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
});
