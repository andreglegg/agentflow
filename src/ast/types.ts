export interface Loc {
  line: number;
  column: number;
  offset: number;
}

export type ValueNode =
  | { kind: "string"; value: string; loc: Loc }
  | { kind: "number"; value: number; loc: Loc }
  | { kind: "boolean"; value: boolean; loc: Loc }
  | { kind: "identifier"; value: string; loc: Loc }
  | { kind: "array"; elements: ValueNode[]; loc: Loc };

export interface PropertyNode {
  type: "Property";
  key: string;
  value: ValueNode;
  loc: Loc;
}

export type RuleNode =
  | { kind: "named"; name: string; loc: Loc }
  | { kind: "inline"; text: string; loc: Loc };

export interface RulesBlockNode {
  type: "Rules";
  rules: RuleNode[];
  loc: Loc;
}

export interface CommandEntryNode {
  name: string;
  value: string;
  loc: Loc;
}

export interface CommandsBlockNode {
  type: "Commands";
  entries: CommandEntryNode[];
  loc: Loc;
}

export interface StepNode {
  name: string;
  loc: Loc;
}

export interface WorkflowNode {
  type: "Workflow";
  id: string;
  idLoc: Loc;
  steps: StepNode[];
  loc: Loc;
}

export interface AgentNode {
  type: "Agent";
  id: string;
  idLoc: Loc;
  props: PropertyNode[];
  loc: Loc;
}

export interface GlobListNode {
  key: string;
  values: ValueNode[];
  loc: Loc;
}

export interface PermissionsBlockNode {
  type: "Permissions";
  filesystem: GlobListNode[];
  shell: GlobListNode[];
  loc: Loc;
}

export interface OutputNode {
  type: "Output";
  id: string;
  idLoc: Loc;
  props: PropertyNode[];
  loc: Loc;
}

export type ProjectItem =
  | PropertyNode
  | RulesBlockNode
  | CommandsBlockNode
  | WorkflowNode
  | AgentNode
  | PermissionsBlockNode
  | OutputNode;

export interface ProjectNode {
  type: "Project";
  id: string;
  idLoc: Loc;
  items: ProjectItem[];
  loc: Loc;
}
