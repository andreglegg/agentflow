export interface RuleIR {
  /** Stable identifier used for dedup; named rules use their name, inline rules use the text. */
  id: string;
  /** Human-facing display text emitted into markdown. */
  text: string;
  kind: "named" | "inline";
  line?: number;
  column?: number;
}

export interface CommandIR {
  name: string;
  value: string;
}

export interface AgentIR {
  name: string;
  purpose?: string;
  tools: string[];
  workflow?: string;
}

export interface PermissionIR {
  filesystem: {
    read: string[];
    write: string[];
    deny: string[];
  };
  shell: {
    allow: string[];
    deny: string[];
  };
}

export interface OutputIR {
  name: string;
  include: string[];
  style?: string;
}

export interface AgentFlowProjectIR {
  name: string;
  version?: string;
  stack: string[];
  rules: RuleIR[];
  /** Whether a `rules { }` block was declared at all (vs. simply absent). */
  rulesDeclared: boolean;
  commands: CommandIR[];
  /** Whether a `commands { }` block was declared at all (vs. simply absent). */
  commandsDeclared: boolean;
  /** Ordered workflows: name -> ordered step list. */
  workflows: Record<string, string[]>;
  agents: AgentIR[];
  permissions: PermissionIR;
  outputs: OutputIR[];
  /** Source file path, relative to the project root, used in generated headers. */
  source: string;
}
