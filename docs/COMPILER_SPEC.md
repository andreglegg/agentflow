# Compiler Specification

## 1. Compiler purpose

The compiler transforms `.afx` source files into tool specific instruction files and runtime metadata.

Source files are for humans. Generated files are for AI tools and runtimes.

## 2. Target outputs

MVP targets:

```txt
AGENTS.md
CLAUDE.md
GEMINI.md
.agent/dist/manifest.json
.agent/dist/policy.json
.agent/dist/build-info.json
.agent/dist/schemas/manifest.schema.json
.agent/dist/schemas/policy.schema.json
```

The compiler also emits JSON Schema files for our own outputs, `manifest.json`
and `policy.json`, so generated outputs are themselves validatable. These are
the only schemas in MVP and describe our output files, not user declarations.

Later targets:

```txt
.cursor/rules/*.mdc
.aider.conf.yml
.continue/config.json
.agent/skills/*
.agent/dist/workflows/*.json
.agent/dist/evals/*.json
```

## 3. Compiler pipeline

```txt
Read source files
  -> tokenize
  -> parse
  -> AST
  -> validate
  -> normalize IR
  -> emit target files
  -> write or compare
```

Import resolution is a future pipeline stage (post-MVP).

## 4. Build command behavior

Command:

```bash
agentflow build
```

Options:

```bash
agentflow build --target codex
agentflow build --target claude
agentflow build --target gemini
agentflow build --target runtime
agentflow build --target all
agentflow build --dry-run
agentflow build --print
```

Behavior:

1. Locate project root.
2. Load config if present.
3. Read `.agent/src/project.afx` (single file; multi-file glob is future).
4. Parse and validate.
5. Emit selected targets.
6. Write files.
7. Write `.agent/dist/build-info.json`.
8. Print summary.

## 5. Check command behavior

Command:

```bash
agentflow check
```

Behavior:

1. Compile in memory.
2. Compare expected generated files with files on disk.
3. Print changed or missing files.
4. Exit code 0 if clean.
5. Exit code 1 if stale.

## 6. Validate command behavior

Command:

```bash
agentflow validate
```

Behavior:

1. Parse source files.
2. Run semantic validation.
3. Do not emit files.
4. Print diagnostics.

Validate checks correctness: can the project compile. Lint is separate and
checks quality.

## 7. Lint command behavior

Command:

```bash
agentflow lint
```

Options:

```bash
agentflow lint --strict
```

Behavior:

1. Parse source files.
2. Run lint rules over the IR.
3. Do not emit files.
4. Print findings.

Lint rules (MVP):

- duplicate rules
- directly conflicting rules
- empty sections
- context-budget warning when generated markdown exceeds a configurable
  byte/line budget

Lint findings are warnings by default. With `--strict` they are promoted to
errors. Exit code is 0 when no findings, or when findings are warnings without
`--strict`; exit code is 1 when findings are present and `--strict` is set.

Lint is distinct from validate: validate answers can-it-compile, lint answers
quality, bloat, and conflicts.

## 8. Inspect command behavior

Command:

```bash
agentflow inspect
```

Options:

```bash
agentflow inspect --ast
agentflow inspect --ir
agentflow inspect --target codex
```

Use this for debugging compiler behavior.

## 9. Codex emitter

Output path:

```txt
AGENTS.md
```

Content should include:

- generated header
- project name and stack
- core rules
- commands
- agent roles
- workflow
- permissions expressed as guidance
- response format

Sample section order:

```md
# Agent Instructions

## Generated File Notice
## Project
## Stack
## Core Rules
## Commands
## Agents
## Workflow
## Permissions
## Response Format
```

## 10. Claude emitter

Output path:

```txt
CLAUDE.md
```

Content should include:

- generated header
- persistent project memory wording
- concise behavior rules
- project commands
- workflow
- response format

Claude emitter can be more conversational and task oriented than Codex emitter.

The Claude emitter supports two modes, selectable via init/config:

- Full mode (default): emit complete content into `CLAUDE.md`.
- Import mode: emit `CLAUDE.md` as a thin file that `@imports` `AGENTS.md`
  (Claude Code supports `@path` imports) plus Claude-specific notes, instead of
  duplicating the shared content.

## 11. Gemini emitter

Output path:

```txt
GEMINI.md
```

Content should include:

- generated header
- project context
- coding style
- command shortcuts
- task workflow
- safety guidance

## 12. Runtime manifest emitter

Output path:

```txt
.agent/dist/manifest.json
```

Example:

```json
{
  "schemaVersion": "0.1.0",
  "project": {
    "name": "andre-agent",
    "version": "0.1.0",
    "stack": ["TypeScript", "React"]
  },
  "commands": {
    "test": "pnpm test",
    "lint": "pnpm lint"
  },
  "agents": {
    "Coder": {
      "purpose": "Implement features safely.",
      "tools": ["readFile", "writeFile", "searchRepo", "runCommand"],
      "workflow": "safe_code_change"
    }
  }
}
```

## 13. Policy emitter

Output path:

```txt
.agent/dist/policy.json
```

Example:

```json
{
  "filesystem": {
    "read": ["src/**", "tests/**"],
    "write": ["src/**", "tests/**"],
    "deny": [".env", "node_modules/**"]
  },
  "shell": {
    "allow": ["pnpm test", "pnpm lint", "pnpm build"],
    "deny": ["rm -rf", "curl | bash"]
  }
}
```

## 14. Build info emitter

Output path:

```txt
.agent/dist/build-info.json
```

Example:

```json
{
  "agentflowVersion": "0.1.0",
  "sourceHash": "sha256:abc",
  "builtAt": "2026-06-22T00:00:00.000Z",
  "outputs": {
    "AGENTS.md": "sha256:def",
    "CLAUDE.md": "sha256:ghi"
  }
}
```

`builtAt` is the only timestamp permitted in any output. It is excluded from
`check` comparison and, for deterministic tests, can be disabled or fixed by env
var.

## 15. Generated header

All generated files should say:

```md
<!--
Generated by AgentFlow.
Do not edit this file directly.
Source: .agent/src/project.afx
Run: agentflow build
-->
```

## 16. Determinism requirements

- Sort object keys where stable output matters.
- Preserve source order for user facing rules and workflows.
- Normalize line endings to LF.
- End files with a single newline.
- Avoid timestamps in main outputs.
- `builtAt` in `build-info.json` is the only timestamp in any output.
- Exclude `builtAt` from `check` comparison; allow it to be fixed or disabled via
  env var for tests.

## 17. Diagnostics

Compiler diagnostics should be actionable.

Bad:

```txt
Invalid workflow.
```

Good:

```txt
.agent/src/project.afx:42:13 error AFV002 Unknown workflow "safeEdit" referenced by agent "Coder".
Hint: Add `workflow safeEdit { ... }` or change the agent workflow name.
```

## 18. Golden tests

Every emitter should have golden output tests.

Example structure:

```txt
tests/fixtures/basic/input/.agent/src/project.afx
tests/fixtures/basic/expected/AGENTS.md
tests/fixtures/basic/expected/CLAUDE.md
tests/fixtures/basic/expected/GEMINI.md
```

Test:

```ts
expect(await compileFixture("basic")).toMatchGoldenFiles();
```

## 19. MVP source mapping

The compiler should include source location in AST and diagnostics. Source maps for generated markdown are not needed in MVP, but target sections should include source names in comments where useful.

## 20. Formatter later

The formatter can operate on AST and emit canonical `.afx` source.

Commands:

```bash
agentflow format
agentflow format --check
```

## 21. Compiler API

Expose programmatic API:

```ts
import { compileProject } from "agentflow";

const result = await compileProject({
  rootDir: process.cwd(),
  targets: ["codex", "claude", "runtime"]
});

if (!result.ok) {
  console.error(result.diagnostics);
}
```
