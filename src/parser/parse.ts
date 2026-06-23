import type { Diagnostic } from "../diagnostics/types.js";
import type {
  AgentNode,
  CommandEntryNode,
  CommandsBlockNode,
  GlobListNode,
  Loc,
  OutputNode,
  PermissionsBlockNode,
  ProjectItem,
  ProjectNode,
  PropertyNode,
  RuleNode,
  RulesBlockNode,
  StepNode,
  ValueNode,
  WorkflowNode,
} from "../ast/types.js";
import { LexError, tokenize, type Token } from "./tokenize.js";

export interface ParseResult {
  projects: ProjectNode[];
  diagnostics: Diagnostic[];
}

class ParseError extends Error {
  constructor(public diagnostic: Diagnostic) {
    super(diagnostic.message);
    this.name = "ParseError";
  }
}

const MAX_ARRAY_DEPTH = 32;

class Parser {
  private pos = 0;
  private arrayDepth = 0;

  constructor(
    private tokens: Token[],
    private file: string,
  ) {}

  private peek(): Token {
    return this.tokens[this.pos] as Token;
  }

  private next(): Token {
    const t = this.tokens[this.pos] as Token;
    if (t.type !== "eof") this.pos++;
    return t;
  }

  private locOf(t: Token): Loc {
    return { line: t.line, column: t.column, offset: t.offset };
  }

  private error(message: string, token: Token, hint?: string): never {
    const diagnostic: Diagnostic = {
      severity: "error",
      code: "AFP002",
      message,
      file: this.file,
      line: token.line,
      column: token.column,
    };
    if (hint !== undefined) diagnostic.hint = hint;
    throw new ParseError(diagnostic);
  }

  private isPunct(value: string): boolean {
    const t = this.peek();
    return t.type === "punct" && t.value === value;
  }

  private isKeyword(value: string): boolean {
    const t = this.peek();
    return t.type === "identifier" && t.value === value;
  }

  private expectPunct(value: string): Token {
    if (!this.isPunct(value)) {
      const t = this.peek();
      this.error(
        `Expected ${JSON.stringify(value)} but found ${JSON.stringify(t.value)}.`,
        t,
        value === "}" ? "Did you forget a closing brace?" : undefined,
      );
    }
    return this.next();
  }

  private expectIdentifier(what: string): Token {
    const t = this.peek();
    if (t.type !== "identifier") {
      this.error(`Expected ${what} but found ${JSON.stringify(t.value)}.`, t);
    }
    return this.next();
  }

  parseFile(): ProjectNode[] {
    const projects: ProjectNode[] = [];
    while (this.peek().type !== "eof") {
      if (this.isKeyword("project")) {
        projects.push(this.parseProject());
      } else {
        const t = this.peek();
        this.error(
          `Expected "project" declaration but found ${JSON.stringify(t.value)}.`,
          t,
          "A project file must contain a top-level `project <Name> { ... }` block.",
        );
      }
    }
    return projects;
  }

  private parseProject(): ProjectNode {
    const kw = this.next(); // "project"
    const idTok = this.expectIdentifier("project name identifier");
    this.expectPunct("{");
    const items: ProjectItem[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error("Unexpected end of file. Expected `}`.", this.peek());
      }
      items.push(this.parseProjectItem());
    }
    this.expectPunct("}");
    return {
      type: "Project",
      id: idTok.value,
      idLoc: this.locOf(idTok),
      items,
      loc: { line: kw.line, column: kw.column, offset: kw.offset },
    };
  }

  private parseProjectItem(): ProjectItem {
    if (this.isKeyword("rules")) return this.parseRules();
    if (this.isKeyword("commands")) return this.parseCommands();
    if (this.isKeyword("workflow")) return this.parseWorkflow();
    if (this.isKeyword("agent")) return this.parseAgent();
    if (this.isKeyword("permissions")) return this.parsePermissions();
    if (this.isKeyword("output")) return this.parseOutput();
    // Otherwise: a `key: value` property.
    return this.parseProperty();
  }

  private parseProperty(): PropertyNode {
    const keyTok = this.expectIdentifier("property name");
    this.expectPunct(":");
    const value = this.parseValue();
    return {
      type: "Property",
      key: keyTok.value,
      value,
      loc: this.locOf(keyTok),
    };
  }

  private parseValue(): ValueNode {
    const t = this.peek();
    if (t.type === "string") {
      this.next();
      return { kind: "string", value: t.value, loc: this.locOf(t) };
    }
    if (t.type === "number") {
      this.next();
      return { kind: "number", value: Number(t.value), loc: this.locOf(t) };
    }
    if (t.type === "boolean") {
      this.next();
      return { kind: "boolean", value: t.value === "true", loc: this.locOf(t) };
    }
    if (t.type === "identifier") {
      this.next();
      return { kind: "identifier", value: t.value, loc: this.locOf(t) };
    }
    if (this.isPunct("[")) {
      return this.parseArray();
    }
    this.error(`Expected a value but found ${JSON.stringify(t.value)}.`, t);
  }

  private parseArray(): ValueNode {
    const open = this.expectPunct("[");
    if (this.arrayDepth >= MAX_ARRAY_DEPTH) {
      this.error(
        `Array nesting too deep (limit ${MAX_ARRAY_DEPTH}).`,
        open,
        "Flatten deeply nested arrays.",
      );
    }
    this.arrayDepth++;
    const elements: ValueNode[] = [];
    if (!this.isPunct("]")) {
      elements.push(this.parseValue());
      while (this.isPunct(",")) {
        this.next();
        if (this.isPunct("]")) break; // allow trailing comma
        elements.push(this.parseValue());
      }
    }
    this.expectPunct("]");
    this.arrayDepth--;
    return { kind: "array", elements, loc: this.locOf(open) };
  }

  private parseRules(): RulesBlockNode {
    const kw = this.next();
    this.expectPunct("{");
    const rules: RuleNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error("Unexpected end of file inside `rules`. Expected `}`.", this.peek());
      }
      if (this.isKeyword("rule")) {
        const rkw = this.next();
        const strTok = this.peek();
        if (strTok.type !== "string") {
          this.error(
            `Expected a quoted string after "rule" but found ${JSON.stringify(strTok.value)}.`,
            strTok,
          );
        }
        this.next();
        rules.push({ kind: "inline", text: strTok.value, loc: this.locOf(rkw) });
      } else {
        const nameTok = this.expectIdentifier("rule name");
        rules.push({ kind: "named", name: nameTok.value, loc: this.locOf(nameTok) });
      }
    }
    this.expectPunct("}");
    return { type: "Rules", rules, loc: this.locOf(kw) };
  }

  private parseCommands(): CommandsBlockNode {
    const kw = this.next();
    this.expectPunct("{");
    const entries: CommandEntryNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error(
          "Unexpected end of file inside `commands`. Expected `}`.",
          this.peek(),
        );
      }
      const nameTok = this.expectIdentifier("command name");
      this.expectPunct(":");
      const valTok = this.peek();
      if (valTok.type !== "string") {
        this.error(
          `Expected a quoted command string but found ${JSON.stringify(valTok.value)}.`,
          valTok,
        );
      }
      this.next();
      entries.push({
        name: nameTok.value,
        value: valTok.value,
        loc: this.locOf(nameTok),
      });
    }
    this.expectPunct("}");
    return { type: "Commands", entries, loc: this.locOf(kw) };
  }

  private parseWorkflow(): WorkflowNode {
    const kw = this.next();
    const idTok = this.expectIdentifier("workflow name");
    this.expectPunct("{");
    const steps: StepNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error(
          "Unexpected end of file inside `workflow`. Expected `}`.",
          this.peek(),
        );
      }
      if (!this.isKeyword("step")) {
        const t = this.peek();
        this.error(`Expected "step" but found ${JSON.stringify(t.value)}.`, t);
      }
      this.next(); // "step"
      const stepTok = this.expectIdentifier("step name");
      steps.push({ name: stepTok.value, loc: this.locOf(stepTok) });
    }
    this.expectPunct("}");
    return {
      type: "Workflow",
      id: idTok.value,
      idLoc: this.locOf(idTok),
      steps,
      loc: this.locOf(kw),
    };
  }

  private parseAgent(): AgentNode {
    const kw = this.next();
    const idTok = this.expectIdentifier("agent name");
    this.expectPunct("{");
    const props: PropertyNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error("Unexpected end of file inside `agent`. Expected `}`.", this.peek());
      }
      props.push(this.parseProperty());
    }
    this.expectPunct("}");
    return {
      type: "Agent",
      id: idTok.value,
      idLoc: this.locOf(idTok),
      props,
      loc: this.locOf(kw),
    };
  }

  private parsePermissions(): PermissionsBlockNode {
    const kw = this.next();
    this.expectPunct("{");
    const filesystem: GlobListNode[] = [];
    const shell: GlobListNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error(
          "Unexpected end of file inside `permissions`. Expected `}`.",
          this.peek(),
        );
      }
      if (this.isKeyword("filesystem")) {
        this.next();
        filesystem.push(...this.parseGlobBlock());
      } else if (this.isKeyword("shell")) {
        this.next();
        shell.push(...this.parseGlobBlock());
      } else {
        const t = this.peek();
        this.error(
          `Expected "filesystem" or "shell" but found ${JSON.stringify(t.value)}.`,
          t,
        );
      }
    }
    this.expectPunct("}");
    return { type: "Permissions", filesystem, shell, loc: this.locOf(kw) };
  }

  private parseGlobBlock(): GlobListNode[] {
    this.expectPunct("{");
    const lists: GlobListNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error(
          "Unexpected end of file inside permission block. Expected `}`.",
          this.peek(),
        );
      }
      const keyTok = this.expectIdentifier("permission key (read/write/deny/allow)");
      this.expectPunct(":");
      const value = this.parseValue();
      const values = value.kind === "array" ? value.elements : [value];
      lists.push({ key: keyTok.value, values, loc: this.locOf(keyTok) });
    }
    this.expectPunct("}");
    return lists;
  }

  private parseOutput(): OutputNode {
    const kw = this.next();
    const idTok = this.expectIdentifier("output name");
    this.expectPunct("{");
    const props: PropertyNode[] = [];
    while (!this.isPunct("}")) {
      if (this.peek().type === "eof") {
        this.error("Unexpected end of file inside `output`. Expected `}`.", this.peek());
      }
      props.push(this.parseProperty());
    }
    this.expectPunct("}");
    return {
      type: "Output",
      id: idTok.value,
      idLoc: this.locOf(idTok),
      props,
      loc: this.locOf(kw),
    };
  }
}

export function parse(source: string, file: string): ParseResult {
  let tokens: Token[];
  try {
    tokens = tokenize(source, file);
  } catch (err) {
    if (err instanceof LexError) {
      return { projects: [], diagnostics: [err.diagnostic] };
    }
    throw err;
  }

  const parser = new Parser(tokens, file);
  try {
    const projects = parser.parseFile();
    return { projects, diagnostics: [] };
  } catch (err) {
    if (err instanceof ParseError) {
      return { projects: [], diagnostics: [err.diagnostic] };
    }
    return {
      projects: [],
      diagnostics: [
        {
          severity: "error",
          code: "AFP003",
          message: `Internal parser error: ${err instanceof Error ? err.message : String(err)}`,
          file,
        },
      ],
    };
  }
}
