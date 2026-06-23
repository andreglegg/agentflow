import { describe, expect, it } from "vitest";
import { parse } from "../src/parser/parse.js";

describe("parse", () => {
  it("parses a project with a name", () => {
    const { projects, diagnostics } = parse('project Demo {\n  name: "demo"\n}', "t.afx");
    expect(diagnostics).toHaveLength(0);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe("Demo");
    const nameProp = projects[0]?.items.find(
      (i) => i.type === "Property" && i.key === "name",
    );
    expect(nameProp).toBeDefined();
  });

  it("parses nested blocks, arrays, and rules", () => {
    const src = `project Demo {
      stack: ["TypeScript", "React"]
      rules {
        read_before_write
        rule "Be careful."
      }
      workflow w { step a step b }
      agent Coder { tools: [readFile] workflow: w }
      permissions { filesystem { deny: [".env"] } shell { allow: ["pnpm test"] } }
    }`;
    const { projects, diagnostics } = parse(src, "t.afx");
    expect(diagnostics).toHaveLength(0);
    const items = projects[0]?.items ?? [];
    expect(items.some((i) => i.type === "Rules")).toBe(true);
    expect(items.some((i) => i.type === "Workflow")).toBe(true);
    expect(items.some((i) => i.type === "Agent")).toBe(true);
    expect(items.some((i) => i.type === "Permissions")).toBe(true);
  });

  it("reports a missing closing brace with a location", () => {
    const { diagnostics } = parse('project Demo {\n  name: "demo"\n', "t.afx");
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("AFP002");
    expect(diagnostics[0]?.line).toBeGreaterThan(0);
  });

  it("reports an unterminated string", () => {
    const { diagnostics } = parse('project Demo {\n  name: "demo\n}', "t.afx");
    expect(diagnostics[0]?.code).toBe("AFP001");
  });

  it("reports a non-project top-level token", () => {
    const { diagnostics } = parse("widget Demo {}", "t.afx");
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("AFP002");
  });

  it("reports deeply nested arrays as a diagnostic instead of crashing", () => {
    const deep = "[".repeat(5000) + "]".repeat(5000);
    const src = `project D { name: "d" stack: ${deep} }`;
    let result: ReturnType<typeof parse> | undefined;
    expect(() => {
      result = parse(src, "t.afx");
    }).not.toThrow();
    expect(result?.diagnostics.length).toBeGreaterThan(0);
    expect(result?.diagnostics[0]?.code).toMatch(/^AFP/);
  });
});
