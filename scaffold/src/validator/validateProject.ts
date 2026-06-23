import type {
  AgentNode,
  OutputNode,
  PermissionsBlockNode,
  ProjectNode,
  PropertyNode,
  ValueNode,
} from "../ast/types.js";
import type { Diagnostic } from "../diagnostics/types.js";
import type {
  AgentFlowProjectIR,
  AgentIR,
  CommandIR,
  OutputIR,
  PermissionIR,
  RuleIR,
} from "../ir/types.js";
import { namedRuleText } from "../util/rules.js";

export interface ValidateResult {
  ir: AgentFlowProjectIR | null;
  diagnostics: Diagnostic[];
}

function asStringValue(value: ValueNode): string | undefined {
  return value.kind === "string" ? value.value : undefined;
}

function asStringArray(value: ValueNode): string[] {
  if (value.kind === "array") {
    return value.elements
      .filter((e): e is Extract<ValueNode, { kind: "string" }> => e.kind === "string")
      .map((e) => e.value);
  }
  return value.kind === "string" ? [value.value] : [];
}

function asIdentifierArray(value: ValueNode): string[] {
  if (value.kind === "array") {
    return value.elements
      .filter(
        (e): e is Extract<ValueNode, { kind: "identifier" } | { kind: "string" }> =>
          e.kind === "identifier" || e.kind === "string",
      )
      .map((e) => e.value);
  }
  if (value.kind === "identifier" || value.kind === "string") return [value.value];
  return [];
}

function findProp(props: PropertyNode[], key: string): PropertyNode | undefined {
  return props.find((p) => p.key === key);
}

export function validateProject(projects: ProjectNode[], file: string): ValidateResult {
  const diagnostics: Diagnostic[] = [];

  if (projects.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "AFV000",
      message: "No project declaration found.",
      file,
      hint: "Add a top-level `project <Name> { ... }` block.",
    });
    return { ir: null, diagnostics };
  }

  if (projects.length > 1) {
    const extra = projects[1] as ProjectNode;
    diagnostics.push({
      severity: "error",
      code: "AFV001",
      message: "More than one project block. Exactly one is allowed.",
      file,
      line: extra.loc.line,
      column: extra.loc.column,
      hint: "Keep a single `project { ... }` block per file.",
    });
  }

  const project = projects[0] as ProjectNode;

  // Collect typed sections from the project items.
  const properties: PropertyNode[] = [];
  let rulesIR: RuleIR[] = [];
  let rulesDeclared = false;
  const commands: CommandIR[] = [];
  let commandsDeclared = false;
  const workflows: Record<string, string[]> = {};
  const agents: AgentIR[] = [];
  const agentEntries: { agent: AgentIR; node: AgentNode }[] = [];
  const outputs: OutputIR[] = [];
  let permissions: PermissionIR = {
    filesystem: { read: [], write: [], deny: [] },
    shell: { allow: [], deny: [] },
  };

  const seenCommands = new Map<string, true>();
  const seenAgents = new Map<string, true>();

  for (const item of project.items) {
    switch (item.type) {
      case "Property":
        properties.push(item);
        break;
      case "Rules":
        rulesDeclared = true;
        rulesIR = item.rules.map((r) =>
          r.kind === "named"
            ? {
                id: r.name,
                text: namedRuleText(r.name),
                kind: "named" as const,
                line: r.loc.line,
                column: r.loc.column,
              }
            : {
                id: r.text,
                text: r.text,
                kind: "inline" as const,
                line: r.loc.line,
                column: r.loc.column,
              },
        );
        break;
      case "Commands":
        commandsDeclared = true;
        for (const entry of item.entries) {
          if (seenCommands.has(entry.name)) {
            diagnostics.push({
              severity: "error",
              code: "AFV003",
              message: `Duplicate command ${JSON.stringify(entry.name)}.`,
              file,
              line: entry.loc.line,
              column: entry.loc.column,
              hint: "Command names must be unique.",
            });
            continue;
          }
          seenCommands.set(entry.name, true);
          commands.push({ name: entry.name, value: entry.value });
        }
        break;
      case "Workflow":
        workflows[item.id] = item.steps.map((s) => s.name);
        break;
      case "Agent": {
        const agent = buildAgent(item, diagnostics, file, seenAgents);
        agents.push(agent);
        agentEntries.push({ agent, node: item });
        break;
      }
      case "Permissions":
        permissions = buildPermissions(item, diagnostics, file);
        break;
      case "Output":
        outputs.push(buildOutput(item));
        break;
    }
  }

  // Project name (required, non-empty).
  const nameProp = findProp(properties, "name");
  const name = nameProp ? asStringValue(nameProp.value) : undefined;
  if (name === undefined || name.trim() === "") {
    diagnostics.push({
      severity: "error",
      code: "AFV002",
      message: "Project is missing a non-empty `name`.",
      file,
      line: nameProp?.loc.line ?? project.idLoc.line,
      column: nameProp?.loc.column ?? project.idLoc.column,
      hint: 'Add `name: "your-project"` inside the project block.',
    });
  }

  const versionProp = findProp(properties, "version");
  const version = versionProp ? asStringValue(versionProp.value) : undefined;
  const stackProp = findProp(properties, "stack");
  const stack = stackProp ? asStringArray(stackProp.value) : [];

  // Agent workflow references must resolve. Use the exact source node each
  // agent was built from so duplicate-named agents still report distinct loc.
  for (const { agent, node } of agentEntries) {
    if (agent.workflow !== undefined && workflows[agent.workflow] === undefined) {
      diagnostics.push({
        severity: "error",
        code: "AFV005",
        message: `Unknown workflow ${JSON.stringify(agent.workflow)} referenced by agent ${JSON.stringify(agent.name)}.`,
        file,
        line: node.idLoc.line,
        column: node.idLoc.column,
        hint: `Define workflow ${agent.workflow} or change the agent's workflow.`,
      });
    }
  }

  const ir: AgentFlowProjectIR = {
    name: name ?? "",
    stack,
    rules: rulesIR,
    rulesDeclared,
    commands,
    commandsDeclared,
    workflows,
    agents,
    permissions,
    outputs,
    source: file,
  };
  if (version !== undefined) ir.version = version;

  return { ir, diagnostics };
}

function buildAgent(
  node: AgentNode,
  diagnostics: Diagnostic[],
  file: string,
  seen: Map<string, true>,
): AgentIR {
  if (seen.has(node.id)) {
    diagnostics.push({
      severity: "error",
      code: "AFV004",
      message: `Duplicate agent ${JSON.stringify(node.id)}.`,
      file,
      line: node.idLoc.line,
      column: node.idLoc.column,
      hint: "Agent names must be unique.",
    });
  }
  seen.set(node.id, true);

  const purposeProp = findProp(node.props, "purpose");
  const toolsProp = findProp(node.props, "tools");
  const workflowProp = findProp(node.props, "workflow");

  const agent: AgentIR = {
    name: node.id,
    tools: toolsProp ? asIdentifierArray(toolsProp.value) : [],
  };
  if (purposeProp) {
    const p = asStringValue(purposeProp.value);
    if (p !== undefined) agent.purpose = p;
  }
  if (workflowProp && workflowProp.value.kind === "identifier") {
    agent.workflow = workflowProp.value.value;
  } else if (workflowProp && workflowProp.value.kind === "string") {
    agent.workflow = workflowProp.value.value;
  }
  return agent;
}

function buildPermissions(
  node: PermissionsBlockNode,
  diagnostics: Diagnostic[],
  file: string,
): PermissionIR {
  const perm: PermissionIR = {
    filesystem: { read: [], write: [], deny: [] },
    shell: { allow: [], deny: [] },
  };

  const collect = (
    lists: PermissionsBlockNode["filesystem"],
    target: Record<string, string[]>,
    allowedKeys: string[],
  ): void => {
    for (const list of lists) {
      if (!allowedKeys.includes(list.key)) {
        diagnostics.push({
          severity: "error",
          code: "AFV007",
          message: `Unknown permission key ${JSON.stringify(list.key)}.`,
          file,
          line: list.loc.line,
          column: list.loc.column,
          hint: `Allowed keys: ${allowedKeys.join(", ")}.`,
        });
        continue;
      }
      const globs: string[] = [];
      for (const v of list.values) {
        const s = v.kind === "string" ? v.value : undefined;
        if (s === undefined || s.trim() === "") {
          diagnostics.push({
            severity: "error",
            code: "AFV006",
            message: `Empty or malformed permission glob in ${JSON.stringify(list.key)}.`,
            file,
            line: v.loc.line,
            column: v.loc.column,
            hint: "Permission entries must be non-empty quoted glob strings.",
          });
          continue;
        }
        globs.push(s);
      }
      target[list.key] = (target[list.key] ?? []).concat(globs);
    }
  };

  collect(node.filesystem, perm.filesystem as unknown as Record<string, string[]>, [
    "read",
    "write",
    "deny",
  ]);
  collect(node.shell, perm.shell as unknown as Record<string, string[]>, [
    "allow",
    "deny",
  ]);

  return perm;
}

function buildOutput(node: OutputNode): OutputIR {
  const includeProp = findProp(node.props, "include");
  const styleProp = findProp(node.props, "style");
  const out: OutputIR = {
    name: node.id,
    include: includeProp ? asIdentifierArray(includeProp.value) : [],
  };
  if (styleProp) {
    const s =
      styleProp.value.kind === "string"
        ? styleProp.value.value
        : styleProp.value.kind === "identifier"
          ? styleProp.value.value
          : undefined;
    if (s !== undefined) out.style = s;
  }
  return out;
}
