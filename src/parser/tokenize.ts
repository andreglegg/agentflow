import type { Diagnostic } from "../diagnostics/types.js";

export type TokenType = "identifier" | "string" | "number" | "boolean" | "punct" | "eof";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  offset: number;
}

/** Thrown by the tokenizer; carries a structured diagnostic. */
export class LexError extends Error {
  constructor(public diagnostic: Diagnostic) {
    super(diagnostic.message);
    this.name = "LexError";
  }
}

const PUNCT = new Set(["{", "}", "[", "]", ":", ","]);

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

export function tokenize(source: string, file: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const len = source.length;

  const advance = (n = 1): void => {
    for (let k = 0; k < n; k++) {
      if (source[i] === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
      i++;
    }
  };

  const fail = (message: string, hint?: string): never => {
    const diagnostic: Diagnostic = {
      severity: "error",
      code: "AFP001",
      message,
      file,
      line,
      column,
    };
    if (hint !== undefined) diagnostic.hint = hint;
    throw new LexError(diagnostic);
  };

  while (i < len) {
    const ch = source[i] as string;

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      while (i < len && source[i] !== "\n") advance();
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const startLine = line;
      const startCol = column;
      advance(2);
      let closed = false;
      while (i < len) {
        if (source[i] === "*" && source[i + 1] === "/") {
          advance(2);
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) {
        const diagnostic: Diagnostic = {
          severity: "error",
          code: "AFP001",
          message: "Unterminated block comment.",
          file,
          line: startLine,
          column: startCol,
        };
        throw new LexError(diagnostic);
      }
      continue;
    }

    // String
    if (ch === '"') {
      const startLine = line;
      const startCol = column;
      const startOffset = i;
      advance(); // opening quote
      let value = "";
      let terminated = false;
      while (i < len) {
        const c = source[i] as string;
        if (c === "\\") {
          const next = source[i + 1];
          if (next === undefined) break;
          switch (next) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "\t";
              break;
            case '"':
              value += '"';
              break;
            case "\\":
              value += "\\";
              break;
            default:
              value += next;
          }
          advance(2);
          continue;
        }
        if (c === '"') {
          advance();
          terminated = true;
          break;
        }
        if (c === "\n") break; // newline inside string is not allowed
        value += c;
        advance();
      }
      if (!terminated) {
        const diagnostic: Diagnostic = {
          severity: "error",
          code: "AFP001",
          message: "Unterminated string literal.",
          file,
          line: startLine,
          column: startCol,
          hint: "Add a closing double quote.",
        };
        throw new LexError(diagnostic);
      }
      tokens.push({
        type: "string",
        value,
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Number
    if (isDigit(ch) || (ch === "-" && isDigit(source[i + 1] ?? ""))) {
      const startLine = line;
      const startCol = column;
      const startOffset = i;
      let raw = "";
      if (ch === "-") {
        raw += ch;
        advance();
      }
      while (i < len && isDigit(source[i] as string)) {
        raw += source[i];
        advance();
      }
      if (source[i] === ".") {
        raw += ".";
        advance();
        while (i < len && isDigit(source[i] as string)) {
          raw += source[i];
          advance();
        }
      }
      tokens.push({
        type: "number",
        value: raw,
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Identifier / boolean
    if (isIdentStart(ch)) {
      const startLine = line;
      const startCol = column;
      const startOffset = i;
      let raw = "";
      while (i < len && isIdentPart(source[i] as string)) {
        raw += source[i];
        advance();
      }
      const type: TokenType =
        raw === "true" || raw === "false" ? "boolean" : "identifier";
      tokens.push({
        type,
        value: raw,
        line: startLine,
        column: startCol,
        offset: startOffset,
      });
      continue;
    }

    // Punctuation
    if (PUNCT.has(ch)) {
      tokens.push({
        type: "punct",
        value: ch,
        line,
        column,
        offset: i,
      });
      advance();
      continue;
    }

    fail(`Unexpected character ${JSON.stringify(ch)}.`);
  }

  tokens.push({ type: "eof", value: "<eof>", line, column, offset: i });
  return tokens;
}
