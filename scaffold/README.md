# agentflow (MVP implementation)

Reference implementation of the AgentFlow MVP: a compiler that turns a single
`.agent/src/project.afx` source file into the instruction files coding agents
read (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) plus machine-readable runtime data.

The authoritative scope is [`../docs/MVP_SPEC.md`](../docs/MVP_SPEC.md); design
rationale is in [`../docs/DECISIONS.md`](../docs/DECISIONS.md).

## Install & develop

```bash
pnpm install
pnpm build       # tsc -> dist/
pnpm test        # vitest (42 tests: tokenizer, parser, validator, lint, golden, CLI smoke)
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm format      # prettier --write
```

## CLI

```bash
agentflow init        # write .agent/src/project.afx and build all targets (--force to overwrite)
agentflow build       # compile source -> targets (--claude-import for thin CLAUDE.md @import mode)
agentflow check       # nonzero exit if generated files are stale (for CI)
agentflow validate    # parse + semantic checks, report diagnostics
agentflow inspect     # print the normalized IR (--ast for the parsed AST)
agentflow lint        # quality checks: duplicate/conflicting rules, empty sections, context budget (--strict)
```

During development, run the CLI without building via `pnpm dev -- <command>`.

## Outputs

`build` writes 8 deterministic files:

```
AGENTS.md
CLAUDE.md
GEMINI.md
.agent/dist/manifest.json
.agent/dist/policy.json
.agent/dist/schemas/manifest.schema.json
.agent/dist/schemas/policy.schema.json
.agent/dist/build-info.json   # only file with a timestamp; builtAt is excluded from `check`
```

Generated markdown and `policy.json` are **guidance and data, not enforcement** —
they do nothing until a host tool reads them or a (later) runtime brokers tool calls.

## Module layout

```
src/
  diagnostics/   diagnostic types + formatting
  ast/           AST node types
  parser/        tokenize.ts, parse.ts (hand-written recursive descent)
  ir/            normalized project IR
  validator/     AST -> IR + AFV### diagnostics
  lint/          IR -> AFL### diagnostics
  emitters/      codex/claude/gemini markdown, manifest/policy/schemas/build-info JSON
  compiler/      compileProject orchestration
  fs/            project-root discovery
  cli/           commander wiring + per-command handlers
```

## Validation vs lint

- **validate** (`AFV###`) — correctness: can it compile? Missing name, duplicate
  command/agent, unknown workflow reference, malformed permission glob, >1 project.
- **lint** (`AFL###`) — quality: duplicate rules, directly conflicting rules, empty
  sections, and a context-budget warning when generated markdown grows too large.
  Warnings by default; `--strict` makes any finding a nonzero exit.
