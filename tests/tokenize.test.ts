import { describe, expect, it } from "vitest";
import { tokenize, LexError } from "../src/parser/tokenize.js";

describe("tokenize", () => {
  it("tokenizes identifiers, strings, numbers, booleans, punctuation", () => {
    const tokens = tokenize(
      'project Demo { name: "x" n: 3 b: true list: [a, "y"] }',
      "t.afx",
    );
    const kinds = tokens.map((t) => `${t.type}:${t.value}`);
    expect(kinds).toEqual([
      "identifier:project",
      "identifier:Demo",
      "punct:{",
      "identifier:name",
      "punct::",
      "string:x",
      "identifier:n",
      "punct::",
      "number:3",
      "identifier:b",
      "punct::",
      "boolean:true",
      "identifier:list",
      "punct::",
      "punct:[",
      "identifier:a",
      "punct:,",
      "string:y",
      "punct:]",
      "punct:}",
      "eof:<eof>",
    ]);
  });

  it("tracks line and column", () => {
    const tokens = tokenize("project\n  Demo", "t.afx");
    expect(tokens[0]).toMatchObject({ value: "project", line: 1, column: 1 });
    expect(tokens[1]).toMatchObject({ value: "Demo", line: 2, column: 3 });
  });

  it("skips line and block comments", () => {
    const tokens = tokenize("// hi\n/* block */ name", "t.afx");
    expect(tokens.map((t) => t.value)).toEqual(["name", "<eof>"]);
  });

  it("throws LexError on an unterminated string", () => {
    expect(() => tokenize('name: "oops', "t.afx")).toThrow(LexError);
  });

  it("throws LexError on an unterminated block comment", () => {
    expect(() => tokenize("/* never ends", "t.afx")).toThrow(LexError);
  });

  it("throws LexError on an unexpected character", () => {
    expect(() => tokenize("name @ 1", "t.afx")).toThrow(LexError);
  });
});
