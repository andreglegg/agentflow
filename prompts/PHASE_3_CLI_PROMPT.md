# Codex Prompt: Phase 3 CLI

Implement the AgentFlow CLI.

## Commands

```bash
agentflow init
agentflow build
agentflow check
agentflow validate
agentflow inspect
agentflow lint
```

## Requirements

- Locate project root by finding `.agent/src/project.afx`, `agent.config.ts`, or `package.json`.
- `init` creates default files but does not overwrite unless `--force` is passed.
- `build` writes generated files.
- `check` compares generated output with disk and exits nonzero if stale.
- `validate` prints parser and semantic diagnostics.
- `inspect` prints normalized IR by default.
- `lint` reports quality findings (duplicate/conflicting rules, empty sections, context-budget). Findings are warnings by default; `--strict` promotes them to errors and exits nonzero.

## Tests

Add CLI smoke tests using temporary directories.

## Done when

A fresh repo can run:

```bash
agentflow init
agentflow build
agentflow check
```
