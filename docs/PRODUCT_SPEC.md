# Product Specification: AgentFlow

## 1. Product name

Working name: AgentFlow

Possible alternatives:

- AFX
- AgentScript
- FlowPrompt
- PromptOS
- AgentKit
- Agent Components

The file extension used in this spec is `.afx`.

## 2. Problem

AI coding agents are increasingly controlled through project instruction files such as markdown files, rule files, memory files, and tool configuration. This is useful, but the current pattern has structural problems:

- Instructions are duplicated across tools.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, and local agent configs drift apart.
- Markdown cannot express strong types, permissions, workflows, or tests.
- Long prompt files become hard to review and refactor.
- Teams cannot easily package and reuse proven agent behavior.
- There is no compile step to catch broken agent definitions before use.
- There is limited separation between human readable guidance and machine readable policy.

The opportunity is to create a layer above markdown, similar to how modern frontend frameworks sit above static HTML.

## 3. Product vision

AgentFlow is a structured + validated, testable, composable source language and compiler for agent behavior.

Humans write structured `.afx` files. The compiler emits the files that current LLM coding tools already consume, plus machine readable manifests for stricter runtimes.

## 4. Product goals

### MVP goals

- Define project level agent instructions once.
- Compile to `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agent/dist/manifest.json`, `.agent/dist/policy.json`, `.agent/dist/build-info.json`, and the JSON Schemas `.agent/dist/schemas/manifest.schema.json` and `.agent/dist/schemas/policy.schema.json`.
- Support rules, commands, agents, workflows, permissions, schemas, and output formats.
- Provide a CLI with `init`, `build`, `check`, `validate`, `inspect`, and `lint`.
- Detect stale generated files.
- Make generated files clear enough for current LLM tools.

The authoritative MVP definition lives in [docs/MVP_SPEC.md](MVP_SPEC.md); the MVP goals here and the MVP feature list in section 10 must match it.

### Later goals

- Add a language server.
- Add package imports.
- Add agent tests and eval harnesses.
- Add runtime enforcement.
- Add target adapters for Cursor, Aider, Continue, Goose, OpenAI Codex Skills, Claude Code hooks, Gemini MCP, and local runners.
- Add a registry of reusable agent modules.

## 5. Non goals for MVP

- Do not build a full autonomous agent runtime first.
- Do not build a visual editor first.
- Do not create a huge programming language.
- Do not require existing LLM tools to understand `.afx` directly.
- Do not depend on proprietary APIs to compile files.

## 6. Target users

### Solo developer

A developer who uses Codex, Claude Code, Gemini CLI, Cursor, and other coding agents across multiple projects. They want one source of truth for agent behavior.

### AI heavy engineering team

A team that wants consistent coding agent rules across repos. They need reviewable source files, policy control, and generated outputs.

### Agent platform builder

Someone building a local first autonomous agent that needs policies, memory schemas, workflows, and enforcement.

## 7. Core user stories

### Story 1: Initialize a project

As a developer, I run:

```bash
agentflow init
```

The tool creates:

```txt
.agent/src/project.afx
AGENTS.md
CLAUDE.md
GEMINI.md
.agent/dist/manifest.json
```

### Story 2: Compile project instructions

As a developer, I edit `.agent/src/project.afx` and run:

```bash
agentflow build
```

The tool regenerates all targets.

### Story 3: Use the generated output with Codex

As a developer, I open Codex in the repo. Codex reads `AGENTS.md` and follows the generated project instructions.

### Story 4: Prevent instruction drift

As a developer, I run:

```bash
agentflow check
```

The command fails if generated files do not match the source `.afx` files.

### Story 5: Package rules (Later — not MVP; requires imports/runtime)

As a team, we import a shared rule pack:

```afx
import "@company/strict-typescript"
import "@company/security-baseline"
```

All repos inherit the same rules.

### Story 6: Enforce policies in active runtime (Later — not MVP; requires imports/runtime)

As an advanced user, I run:

```bash
agentflow run Coder "Fix the failing tests"
```

The runtime enforces policies such as no writes to `.env`, no shell commands outside the allowlist, and no write before read.

## 8. Product principles

### One source of truth

Users should not maintain separate instructions for every LLM tool by hand.

### Source is human friendly, output is tool friendly

`.afx` is optimized for humans and review. Generated files are optimized for agent tools.

### Guidance and enforcement are separate

Generated markdown guides the model. Runtime policy enforces hard limits.

### Tests are first class (language-level test blocks are later — not MVP, per D3)

In the long term, agent behavior should be testable like application behavior. MVP testability is limited to compiler, golden, and CLI tests of the toolchain itself, not user-authored `.afx` test blocks.

### Portable by design

The same source should compile to several targets.

### Small MVP, deep foundation

The first version should be simple, but the architecture should support schemas, policies, workflows, imports, and language server support.

## 9. Core entities

### Project

Represents a repository and its conventions.

### Agent

Represents a specialized role such as Coder, Reviewer, Researcher, Planner, ReleaseManager, or SecurityAuditor.

### Rule

A behavior instruction, usually human readable and target portable.

### Command

A named project command, such as test, lint, build, dev, format.

### Tool

A capability exposed by a runtime or LLM tool.

### Permission

A hard or soft rule about what tools can access.

### Workflow

Ordered steps (MVP). State-machine workflows are later — not MVP, per D3.

### Schema

JSON Schemas for AgentFlow's own output files (`manifest.json`, `policy.json`) in MVP. User-defined typed input/output shapes are a future aspiration, not MVP.

### Test

A language-level test block for agent definitions (later — not MVP, per D3).

## 10. MVP feature list

### CLI

- `agentflow init`
- `agentflow build`
- `agentflow check`
- `agentflow validate`
- `agentflow inspect`
- `agentflow lint`

### Source language

- project block
- metadata
- stack declaration
- rules block
- commands block
- agents block
- workflows block
- permissions block
- output block
- imports as later MVP plus one

### Emitters

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.agent/dist/manifest.json`
- `.agent/dist/policy.json`
- `.agent/dist/build-info.json`
- `.agent/dist/schemas/manifest.schema.json`
- `.agent/dist/schemas/policy.schema.json`

### Validation

- missing or empty project name
- more than one project block
- duplicate command names
- duplicate agent names
- agent references an unknown workflow
- empty or malformed permission glob strings

### Lint

The headline differentiator. Lint is distinct from validate: validate checks correctness (can it compile?), lint checks quality (bloat and conflicts).

- duplicate rules
- directly conflicting rules
- empty sections
- context-budget warning when generated markdown exceeds a configurable byte/line budget

Lint findings are warnings by default; `--strict` promotes them to errors.

### Testing

- parser tests
- validator tests
- lint unit tests
- emitter golden tests
- CLI smoke tests

## 11. Success metrics

### Developer adoption metrics

- Time to add agent instructions to a new repo is under 2 minutes.
- One `.afx` file can generate at least 3 target outputs.
- Stale generated files are detected reliably.
- Golden tests make compiler output reviewable.

### Product quality metrics

- Parser errors include line and column.
- Build output is deterministic.
- Generated markdown is readable by humans.
- Generated manifests are stable and schema validated.

### Long term metrics

- Number of supported target adapters.
- Number of reusable packages.
- Number of teams using check in CI.
- Reduction in duplicated prompt files across repos.

## 12. Pricing or distribution ideas

### Open source core

- Parser
- Compiler
- CLI
- Basic emitters
- Basic tests

### Paid or hosted layer later

- Team rule registry
- Web dashboard
- Eval analytics
- Policy audit logs
- Runtime enforcement gateway
- Enterprise shared packs

## 13. Risks

### Risk: language becomes too complex

Mitigation: keep MVP declarative and focused on common coding agent needs.

### Risk: generated markdown is ignored by LLM tools

Mitigation: emit direct, concise, redundant instructions in target specific style.

### Risk: every tool uses a different context format

Mitigation: create adapter architecture and allow custom target templates.

### Risk: users edit generated files directly

Mitigation: generated header, stale checks, and CI guard.

### Risk: enforcement cannot be done through markdown alone

Mitigation: explicitly separate passive mode and active runtime mode.

## 14. Final product shape

AgentFlow should eventually feel like:

```bash
agentflow init
agentflow build
agentflow check
agentflow test
agentflow run Coder "Add billing settings"
```

And the project should contain:

```txt
.agent/src/        human edited source
.agent/dist/       machine readable generated runtime files
AGENTS.md          generated Codex guidance
CLAUDE.md          generated Claude guidance
GEMINI.md          generated Gemini guidance
.cursor/rules/     generated Cursor guidance
```
