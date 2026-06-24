# Runtime Specification

> STATUS: VISION / LATER — NOT MVP. The active runtime (`agentflow run`) is explicitly phase 2 and is NOT part of the v0.1 MVP. The MVP is the compiler only (build/check/validate/inspect/lint). Everything in this document describes the future runtime and must not be read as a current capability. See section 16.

## 1. Runtime purpose

The compiler can generate markdown guidance for existing LLM tools. That is passive mode.

The runtime is active mode. It executes agent workflows through a controlled wrapper and enforces policies that markdown cannot enforce.

## 2. Passive mode versus active mode

### Passive mode

```bash
agentflow build
codex
```

The LLM reads generated files like `AGENTS.md`. The instructions guide behavior but are not hard enforced by AgentFlow.

### Active mode

```bash
agentflow run Coder "Fix the failing tests"
```

AgentFlow loads `.agent/dist/manifest.json` and `.agent/dist/policy.json`, then brokers tool calls and enforces rules.

## 3. Runtime MVP

Runtime is not required for compiler MVP. If built, the first runtime should be minimal:

- load manifest
- select agent
- render system prompt from manifest
- expose limited tools
- enforce filesystem policy
- enforce shell command allowlist
- write trace logs

## 4. Runtime command

```bash
agentflow run Coder "Add settings page"
```

Options:

```bash
agentflow run Coder "Fix bug" --dry-run
agentflow run Coder "Fix bug" --trace
agentflow run Coder "Fix bug" --model openai:gpt-5.1
agentflow run Coder "Fix bug" --approval-mode suggest
```

## 5. Runtime execution loop

Basic loop:

```txt
load manifest
load policy
select agent
construct prompt
start conversation
while not done:
  model proposes action
  runtime validates action
  runtime executes allowed tool
  runtime records trace
  runtime returns result to model
validate final output
write summary
```

## 6. Tool broker

The runtime should never give the model raw unrestricted access to the filesystem or shell.

All tool calls go through a broker:

```ts
interface ToolBroker {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  searchRepo(query: string): Promise<SearchResult[]>;
  runCommand(command: string): Promise<CommandResult>;
}
```

The broker checks policies before running actions.

## 7. Filesystem policy

Policy:

```json
{
  "filesystem": {
    "read": ["src/**", "tests/**", "docs/**", "package.json"],
    "write": ["src/**", "tests/**", "docs/**"],
    "deny": [".env", "node_modules/**", "dist/**"]
  }
}
```

Enforcement rules:

- deny wins over allow
- paths are normalized relative to project root
- no absolute path access by default
- no path traversal outside project root
- symlinks should be resolved carefully

## 8. Shell policy

Policy:

```json
{
  "shell": {
    "allow": ["pnpm test", "pnpm lint", "pnpm build"],
    "deny": ["rm -rf", "curl | bash", "git push --force"]
  }
}
```

Crudest first step (guidance-only):

- allow exact command strings only
- block everything else unless approval mode allows user confirmation

KNOWN LIMITATION: exact-string allowlisting is the crudest first step and is guidance-only. It breaks on arguments and flags — e.g. `pnpm test --watch` does not match the allowed `pnpm test` entry, so legitimate variations are blocked while the matched string gives no real safety.

Real enforcement model (later):

- execute via an argv array (NO shell, NO `sh -c`) so the command and its arguments are never re-parsed by a shell
- working-directory restriction
- environment-variable allowlist
- per-command timeout

## 9. Approval modes

```txt
suggest       model suggests, user applies
approve       user approves risky actions
auto-safe     safe allowlisted actions run automatically
full-auto     all allowed actions run automatically
```

MVP should support `suggest` and `auto-safe`.

## 10. Workflow tracking

For ordered workflows, track current step:

```json
{
  "workflow": "safe_code_change",
  "currentStep": "inspect",
  "completedSteps": ["understand"],
  "remainingSteps": ["plan", "edit", "test", "report"]
}
```

The runtime can remind the model when it tries to skip ahead.

Hard state machine enforcement can come later.

## 11. Read before write enforcement

Rule:

- If an agent tries to write `src/auth.ts`, it must have read `src/auth.ts` in the current session first.

Trace state:

```json
{
  "readFiles": ["src/auth.ts"],
  "writtenFiles": []
}
```

This is one of the most useful active runtime features.

## 12. Output validation

If the final output must match a schema, runtime validates it.

Example summary schema:

```json
{
  "type": "object",
  "required": ["changedFiles", "commandsRun", "testResult", "risks"],
  "properties": {
    "changedFiles": { "type": "array", "items": { "type": "string" } },
    "commandsRun": { "type": "array", "items": { "type": "string" } },
    "testResult": { "type": "string", "enum": ["pass", "fail", "not_run"] },
    "risks": { "type": "array", "items": { "type": "string" } }
  }
}
```

## 13. Trace logs

Every runtime session should produce trace logs.

```txt
.agent/runs/2026-06-22T12-00-00Z/
  trace.jsonl
  final.md
  tool-results/
```

Trace event example:

```json
{"type":"tool_call","tool":"readFile","path":"src/auth.ts","allowed":true,"timestamp":"..."}
```

## 14. Security model

The runtime must assume model output is untrusted.

Rules:

- do not execute commands without policy check
- do not expose secrets by default
- do not allow hidden writes outside project root
- redact sensitive values from trace logs
- prefer user approval for destructive operations

## 15. Runtime adapters

Later model adapters:

- OpenAI Responses API
- Anthropic Messages API
- Gemini API
- local OpenAI compatible endpoint
- Ollama

Adapter interface:

```ts
interface ModelAdapter {
  send(input: ModelInput): Promise<ModelOutput>;
}
```

## 16. Runtime MVP deferral

Build compiler first. Runtime can be phase 2.

Reason:

- Existing tools can consume generated markdown immediately.
- The compiler validates the central product idea.
- Runtime adds complexity around model APIs, tool calls, and safety.
