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

function findProp(props: PropertyNode[], key: string): PropertyNode | undefined {
  return props.find((p) => p.key === key);
}

function malformed(
  diagnostics: Diagnostic[],
  file: string,
  prop: PropertyNode,
  expected: string,
): void {
  diagnostics.push({
    severity: "error",
    code: "AFV010",
    message: `Property ${JSON.stringify(prop.key)} must be ${expected}.`,
    file,
    line: prop.loc.line,
    column: prop.loc.column,
    hint: `Change ${prop.key} to ${expected}.`,
  });
}

function requireString(
  prop: PropertyNode | undefined,
  diagnostics: Diagnostic[],
  file: string,
): string | undefined {
  if (prop === undefined) return undefined;
  const value = asStringValue(prop.value);
  if (value === undefined) malformed(diagnostics, file, prop, "a quoted string");
  return value;
}

function requireStringArray(
  prop: PropertyNode | undefined,
  diagnostics: Diagnostic[],
  file: string,
): string[] {
  if (prop === undefined) return [];
  if (prop.value.kind !== "array") {
    malformed(diagnostics, file, prop, "an array of quoted strings");
    return [];
  }
  const values: string[] = [];
  for (const element of prop.value.elements) {
    if (element.kind !== "string") {
      diagnostics.push({
        severity: "error",
        code: "AFV010",
        message: `Property ${JSON.stringify(prop.key)} must contain only quoted strings.`,
        file,
        line: element.loc.line,
        column: element.loc.column,
        hint: `Remove non-string values from ${prop.key}.`,
      });
      continue;
    }
    values.push(element.value);
  }
  return values;
}

function requireNameArray(
  prop: PropertyNode | undefined,
  diagnostics: Diagnostic[],
  file: string,
): string[] {
  if (prop === undefined) return [];
  if (prop.value.kind !== "array") {
    malformed(diagnostics, file, prop, "an array of identifiers or quoted strings");
    return [];
  }
  const values: string[] = [];
  for (const element of prop.value.elements) {
    if (element.kind !== "identifier" && element.kind !== "string") {
      diagnostics.push({
        severity: "error",
        code: "AFV010",
        message: `Property ${JSON.stringify(prop.key)} must contain only identifiers or quoted strings.`,
        file,
        line: element.loc.line,
        column: element.loc.column,
        hint: `Remove non-name values from ${prop.key}.`,
      });
      continue;
    }
    values.push(element.value);
  }
  return values;
}

function requireIdentifierOrString(
  prop: PropertyNode | undefined,
  diagnostics: Diagnostic[],
  file: string,
): string | undefined {
  if (prop === undefined) return undefined;
  if (prop.value.kind === "identifier" || prop.value.kind === "string") {
    return prop.value.value;
  }
  malformed(diagnostics, file, prop, "an identifier or quoted string");
  return undefined;
}

function duplicateSection(
  diagnostics: Diagnostic[],
  file: string,
  section: string,
  line: number,
  column: number,
): void {
  diagnostics.push({
    severity: "error",
    code: "AFV008",
    message: `Duplicate ${section} section.`,
    file,
    line,
    column,
    hint: `Keep a single ${section} section in the project block.`,
  });
}

function mergePermissions(target: PermissionIR, source: PermissionIR): void {
  target.filesystem.read.push(...source.filesystem.read);
  target.filesystem.write.push(...source.filesystem.write);
  target.filesystem.deny.push(...source.filesystem.deny);
  target.shell.allow.push(...source.shell.allow);
  target.shell.deny.push(...source.shell.deny);
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
  const seenWorkflows = new Map<string, true>();
  const agents: AgentIR[] = [];
  const agentEntries: { agent: AgentIR; node: AgentNode }[] = [];
  const outputs: OutputIR[] = [];
  const seenOutputs = new Map<string, true>();
  let permissions: PermissionIR = {
    filesystem: { read: [], write: [], deny: [] },
    shell: { allow: [], deny: [] },
  };
  let permissionsDeclared = false;

  const seenCommands = new Map<string, true>();
  const seenAgents = new Map<string, true>();

  for (const item of project.items) {
    switch (item.type) {
      case "Property":
        properties.push(item);
        break;
      case "Rules":
        if (rulesDeclared)
          duplicateSection(diagnostics, file, "rules", item.loc.line, item.loc.column);
        rulesDeclared = true;
        rulesIR.push(
          ...item.rules.map((r) =>
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
          ),
        );
        break;
      case "Commands":
        if (commandsDeclared)
          duplicateSection(diagnostics, file, "commands", item.loc.line, item.loc.column);
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
        if (seenWorkflows.has(item.id)) {
          diagnostics.push({
            severity: "error",
            code: "AFV009",
            message: `Duplicate workflow ${JSON.stringify(item.id)}.`,
            file,
            line: item.idLoc.line,
            column: item.idLoc.column,
            hint: "Workflow names must be unique.",
          });
        } else {
          seenWorkflows.set(item.id, true);
          workflows[item.id] = item.steps.map((s) => s.name);
        }
        break;
      case "Agent": {
        const agent = buildAgent(item, diagnostics, file, seenAgents);
        agents.push(agent);
        agentEntries.push({ agent, node: item });
        break;
      }
      case "Permissions":
        if (permissionsDeclared)
          duplicateSection(
            diagnostics,
            file,
            "permissions",
            item.loc.line,
            item.loc.column,
          );
        permissionsDeclared = true;
        mergePermissions(permissions, buildPermissions(item, diagnostics, file));
        break;
      case "Output":
        if (seenOutputs.has(item.id)) {
          diagnostics.push({
            severity: "error",
            code: "AFV011",
            message: `Duplicate output ${JSON.stringify(item.id)}.`,
            file,
            line: item.idLoc.line,
            column: item.idLoc.column,
            hint: "Output names must be unique.",
          });
        } else {
          seenOutputs.set(item.id, true);
          outputs.push(buildOutput(item, diagnostics, file));
        }
        break;
    }
  }

  // Project name (required, non-empty).
  const nameProp = findProp(properties, "name");
  const name = requireString(nameProp, diagnostics, file);
  if (nameProp === undefined || name?.trim() === "") {
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
  const version = requireString(versionProp, diagnostics, file);
  const stackProp = findProp(properties, "stack");
  const stack = requireStringArray(stackProp, diagnostics, file);

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

  const agent: AgentIR = {
    name: node.id,
    tools: requireNameArray(toolsProp, diagnostics, file),
  };
  const purpose = requireString(purposeProp, diagnostics, file);
  if (purpose !== undefined) agent.purpose = purpose;
  const workflow = requireIdentifierOrString(
    findProp(node.props, "workflow"),
    diagnostics,
    file,
  );
  if (workflow !== undefined) agent.workflow = workflow;
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

function buildOutput(
  node: OutputNode,
  diagnostics: Diagnostic[],
  file: string,
): OutputIR {
  const includeProp = findProp(node.props, "include");
  const out: OutputIR = {
    name: node.id,
    include: requireNameArray(includeProp, diagnostics, file),
  };
  const style = requireIdentifierOrString(
    findProp(node.props, "style"),
    diagnostics,
    file,
  );
  if (style !== undefined) out.style = style;
  return out;
}
