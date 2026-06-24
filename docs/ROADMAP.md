# Roadmap

## Milestone 1: Compiler MVP

Goal: prove that `.afx` can compile into useful files for today's coding agents.

Features:

- `.afx` parser
- project declarations
- rules
- commands
- agents
- workflows
- permissions
- markdown emitters
- runtime JSON emitters
- validation (correctness / can-it-compile)
- lint (quality / bloat / conflicts: duplicate rules, conflicting rules, empty sections, context-budget warnings; warnings by default, `--strict` promotes to errors)
- CLI commands (`init`, `build`, `check`, `validate`, `inspect`, `lint`)
- golden tests

Targets:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.agent/dist/manifest.json`
- `.agent/dist/policy.json`
- `.agent/dist/build-info.json`
- `.agent/dist/schemas/manifest.schema.json`
- `.agent/dist/schemas/policy.schema.json`

## Milestone 2: Better developer experience

Features:

- formatter
- syntax highlighting
- watch mode
- error recovery
- import support
- `agentflow explain` command

Commands:

```bash
agentflow format
agentflow watch
agentflow explain Coder
```

## Milestone 3: Package system

Features:

- local imports
- npm based imports
- shared rule packs
- versioned workflow packs
- package lock for agent dependencies

Example:

```afx
import "@agentflow/rules/strict-typescript"
import "@agentflow/workflows/safe-code-change"
```

## Milestone 4: Agent tests

Features:

- `.afx` test declarations
- eval JSON output
- deterministic simulation tests
- model backed tests as optional

Commands:

```bash
agentflow test
agentflow test --model openai:gpt-5.1
```

## Milestone 5: Runtime alpha

Features:

- `agentflow run`
- file broker
- shell broker
- policy enforcement
- trace logs
- read before write enforcement
- output validation

## Milestone 6: Language server

Features:

- diagnostics in editor
- autocomplete for rules and commands
- go to definition for imports
- hover docs
- formatting

## Milestone 7: Visual inspector

Features:

- project graph
- agent graph
- workflow preview
- target output preview
- policy viewer
- stale output viewer

## Milestone 8: Enterprise and team workflows

Features:

- signed rule packages
- private registry
- policy audit logs
- CI templates
- repo fleet synchronization
- team level defaults

## Long term vision

AgentFlow becomes the source format for serious agent software.

The repo contains:

```txt
.agent/src/       agent source
.agent/tests/     agent tests
.agent/dist/      generated runtime output
AGENTS.md         generated tool guidance
CLAUDE.md         generated tool guidance
GEMINI.md         generated tool guidance
```

Teams stop hand editing many prompt files and start treating agent behavior as compiled, tested infrastructure.
