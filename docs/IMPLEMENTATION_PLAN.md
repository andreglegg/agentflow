# Implementation Plan

## Phase 0: Repo setup

Goal: Create a strict TypeScript CLI project.

Tasks:

1. Create pnpm project.
2. Add TypeScript strict config.
3. Add Vitest.
4. Add ESLint and Prettier.
5. Add CLI entrypoint.
6. Add basic CI.

Deliverables:

```txt
package.json
src/cli/main.ts
src/index.ts
tsconfig.json
vitest.config.ts
```

Definition of done:

- `pnpm test` passes
- `pnpm build` passes
- CLI prints help

## Phase 1: Tokenizer and parser

Goal: Parse a useful subset of `.afx`.

Supported syntax:

- declarations
- blocks
- properties
- arrays
- strings
- numbers
- booleans
- identifiers
- comments

Tasks:

1. Implement tokenizer.
2. Implement parser.
3. Add AST types.
4. Add line and column tracking.
5. Add parser tests.

Definition of done:

- parses example project
- rejects invalid syntax with helpful error
- tests cover common cases

## Phase 2: Validator and IR

Goal: Turn AST into normalized project IR.

Tasks:

1. Create IR types.
2. Resolve project declaration.
3. Resolve commands.
4. Resolve workflows.
5. Resolve agents.
6. Resolve permissions.
7. Add validation diagnostics.

Validation rules:

- exactly one project declaration
- project name required
- duplicate command names fail
- agent workflow references must exist
- duplicate agent names fail
- permission glob strings cannot be empty or malformed (read/write/deny)

Definition of done:

- invalid projects return diagnostics
- valid project returns IR

## Phase 3: Markdown emitters

Goal: Compile to `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`.

Tasks:

1. Create emitter interface.
2. Implement generated header.
3. Implement Codex emitter.
4. Implement Claude emitter.
5. Implement Gemini emitter.
6. Add golden tests.

Definition of done:

- generated markdown is deterministic
- golden tests pass
- output is readable and useful

## Phase 4: Runtime JSON emitters

Goal: Compile to machine readable manifest and policy.

Tasks:

1. Implement manifest emitter.
2. Implement policy emitter.
3. Implement build info emitter.
4. Emit JSON Schemas for our outputs (`manifest.schema.json`, `policy.schema.json`).
5. Add golden tests.

Definition of done:

- `.agent/dist/manifest.json` generated
- `.agent/dist/policy.json` generated
- `.agent/dist/schemas/manifest.schema.json` and `policy.schema.json` generated
- build info includes hashes

## Phase 5: CLI commands

Goal: Make the tool usable.

Commands:

```bash
agentflow init
agentflow build
agentflow check
agentflow validate
agentflow inspect
agentflow lint
```

Tasks:

1. Implement project root detection.
2. Implement init templates.
3. Implement build command.
4. Implement check command.
5. Implement validate command.
6. Implement inspect command.
7. Implement `src/lint` module and `lint` command (warnings by default, `--strict` promotes to errors).
8. Add CLI smoke tests.

Lint findings (distinct from validate):

- duplicate rules
- directly conflicting rules
- empty sections
- context-budget warning (generated markdown exceeds configurable byte/line budget)

Definition of done:

- new project can be initialized
- generated files are created
- stale files are detected
- `agentflow lint` reports quality warnings and respects `--strict`

## Phase 6: Documentation

Goal: Make the MVP understandable.

Tasks:

1. Write README.
2. Write quickstart.
3. Write language reference.
4. Write target output docs.
5. Write examples.

Definition of done:

- user can install and compile a project by following docs

## Phase 7: Release MVP

Goal: Publish usable package.

Tasks:

1. Add package metadata.
2. Add changelog.
3. Add license.
4. Add release workflow.
5. Publish npm package.

Definition of done:

```bash
npm create agentflow
agentflow init
agentflow build
```

works in a fresh repo.

## Phase 8: MVP plus features

Features:

- relative imports
- schema declarations
- Cursor rules target
- `.agentflowignore`
- formatter
- VS Code syntax highlighting

## Phase 9: Active runtime

Features:

- `agentflow run`
- file broker
- shell broker
- trace logs
- read before write enforcement
- output validation

## Suggested first implementation branch

```bash
git checkout -b feature/mvp-parser-compiler
```

## Suggested commit order

1. `chore: initialize strict TypeScript CLI project`
2. `feat(parser): add tokenizer for AFX syntax`
3. `feat(parser): parse project declarations and blocks`
4. `feat(validator): normalize project IR`
5. `feat(emitters): generate Codex AGENTS markdown`
6. `feat(emitters): generate Claude and Gemini markdown`
7. `feat(emitters): generate runtime manifest and policy`
8. `feat(cli): add init build check validate inspect commands`
9. `test: add golden compiler fixtures`
10. `docs: add quickstart and language reference`

## Technical decisions

### Parser

Use hand written recursive descent parser for MVP.

Reason:

- small syntax
- easier error messages
- no parser generator dependency

### Config

Support convention first:

```txt
.agent/src/project.afx
```

Then optional config:

```txt
agent.config.ts
```

### Runtime

Do not build runtime first. The compiler already creates value.

### Package manager

Use pnpm.

### Node version

Use Node 22+.

## MVP acceptance checklist

- [ ] `agentflow init` works
- [ ] `agentflow build` works
- [ ] `agentflow check` detects stale files
- [ ] `agentflow validate` reports parse and semantic errors
- [ ] `agentflow lint` works
- [ ] `builtAt` excluded from check / deterministic outputs
- [ ] scaffold deps pinned to exact versions
- [ ] parser tests pass
- [ ] emitter golden tests pass
- [ ] generated files include generated header
- [ ] docs include quickstart
- [ ] examples include one real project
