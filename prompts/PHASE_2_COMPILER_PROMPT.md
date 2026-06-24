# Codex Prompt: Phase 2 Compiler

Implement validation, IR normalization, and target emitters.

## Read first

```txt
docs/COMPILER_SPEC.md
docs/LLM_TARGETS.md
examples/src/project.afx
examples/generated/AGENTS.md
examples/generated/CLAUDE.md
examples/generated/GEMINI.md
examples/dist/manifest.json
examples/dist/policy.json
```

## Requirements

Implement:

```txt
src/validator/validateProject.ts
src/lint/lintProject.ts
src/compiler/compileProject.ts
src/emitters/codex.ts
src/emitters/claude.ts
src/emitters/gemini.ts
src/emitters/runtimeManifest.ts
src/emitters/policy.ts
src/emitters/schemas.ts
```

Validation must catch:

- missing project name
- duplicate commands
- duplicate agents
- unknown workflow references
- malformed permission patterns

Lint must catch (warnings by default; `--strict` promotes to errors):

- duplicate rules
- directly conflicting rules
- empty sections
- context-budget warning (generated markdown exceeds the configured byte/line budget)

The schema emitter must also write JSON Schemas for our outputs:

- `.agent/dist/schemas/manifest.schema.json`
- `.agent/dist/schemas/policy.schema.json`

## Tests

Add golden tests for generated output.

## Done when

A basic `.afx` file compiles into all MVP outputs and tests pass.
