# Codex Master Prompt: Build AgentFlow MVP

You are building AgentFlow, a TypeScript CLI and compiler for `.afx` files.

AgentFlow lets developers write structured agent source files and compile them into AI coding tool guidance files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and runtime JSON manifests.

## Read first

Read these files before implementing. `docs/MVP_SPEC.md` and `docs/DECISIONS.md` are the canonical, authoritative scope; if anything else conflicts, they win:

```txt
docs/MVP_SPEC.md
docs/DECISIONS.md
README.md
AGENTS.md
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/LANGUAGE_SPEC_AFX.md
docs/COMPILER_SPEC.md
docs/IMPLEMENTATION_PLAN.md
```

## Build the MVP

Implement the MVP in phases:

1. Strict TypeScript CLI project.
2. Tokenizer and parser for MVP AFX syntax.
3. AST and normalized IR.
4. Validator.
5. Emitters for Codex, Claude, Gemini, manifest, and policy.
6. CLI commands: init, build, check, validate, inspect, lint.
7. Lint pass (duplicate rules, conflicting rules, empty sections, context-budget warning).
8. Tests and golden fixtures.
9. Documentation and examples.

## Technical constraints

- Use strict TypeScript.
- Prefer pure functions in parser, validator, and emitters.
- Keep target emitters deterministic.
- Generated markdown must include a do not edit header.
- Avoid unnecessary dependencies.
- Add tests as you implement features.

## Definition of done

The repo is successful when this works:

```bash
pnpm install
pnpm test
pnpm build
pnpm agentflow init
pnpm agentflow build
pnpm agentflow check
pnpm agentflow lint
```

And a sample `.agent/src/project.afx` compiles into:

```txt
AGENTS.md
CLAUDE.md
GEMINI.md
.agent/dist/manifest.json
.agent/dist/policy.json
.agent/dist/build-info.json
```
