# Architecture

## 1. System overview

AgentFlow has five major parts:

1. Source language
2. Parser and AST
3. Validator
4. Compiler and target emitters
5. Optional runtime and test harness

The MVP only needs the first four.

```txt
.agent/src/*.afx
      |
      v
Parser -> AST -> Validator -> Compiler -> Target emitters
                                      |
                                      v
                  AGENTS.md, CLAUDE.md, GEMINI.md, .agent/dist/*.json
```

## 2. Recommended repository structure

```txt
agentflow/
  packages/
    ast/
    parser/
    validator/
    compiler/
    emitters/
    cli/
    runtime/
    testing/
  examples/
    basic-project/
    strict-typescript-project/
    multi-agent-project/
  docs/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

For MVP, this can be a single package with internal modules:

```txt
src/
  ast/
  parser/
  validator/
  compiler/
  emitters/
  cli/
  utils/
```

Split into packages once the API stabilizes.

## 3. Core module responsibilities

### Parser

Input: `.afx` source text

Output: AST with source locations

Responsibilities:

- tokenize input
- parse declarations
- preserve comments where useful
- report line and column errors
- avoid target specific behavior

### AST

Input: parser output

Responsibilities:

- define TypeScript interfaces for source declarations
- expose helper functions for traversal
- keep source location on all nodes

### Validator

Input: AST

Output: validated intermediate representation or diagnostics

Responsibilities:

- semantic checks
- duplicate checks
- reference resolution
- defaulting
- normalized command names
- target independent errors

### Compiler

Input: validated IR

Output: target file map

Responsibilities:

- coordinate emitters
- include generated file headers
- produce deterministic output
- compute content hashes
- support target selection

### Emitters

Input: validated IR

Output: target specific file content

Emitters:

- Codex markdown emitter
- Claude markdown emitter
- Gemini markdown emitter
- Cursor rules emitter (later — not MVP, per D3)
- Runtime manifest emitter
- Policy JSON emitter
- Schema emitter

### CLI

Responsibilities:

- parse commands and flags
- locate project root
- load config
- run parser, validator, compiler
- write output files
- handle check mode

### Runtime, later

Responsibilities:

- load manifest and policy
- broker tool calls
- enforce filesystem and shell rules
- track workflow state
- validate outputs
- produce trace logs

## 4. Data flow

### Build command

```txt
agentflow build
```

In MVP, the build parses a single `.agent/src/project.afx` containing exactly one
top-level `project <Identifier> { ... }` block, with all blocks (metadata, rules,
commands, workflow, agent, permissions, output) nested under `project`. Multi-file
projects and `import` resolution are later.

Steps:

1. Find nearest `agent.config.*` or `.agent/src/project.afx`.
2. Read config.
3. Read the project source file.
4. Parse the source file.
5. Validate project.
6. Lint project.
7. Compile all selected targets.
8. Write files.
9. Print summary.

### Check command

```txt
agentflow check
```

Steps:

1. Run build in memory.
2. Compare generated output to disk.
3. If mismatch, show files that are stale.
4. Exit nonzero on mismatch.

### Lint command

```txt
agentflow lint
```

Steps:

1. Parse and validate project.
2. Run the lint pass over the IR (duplicate rules, conflicting rules, empty
   sections, context-budget warnings).
3. Report findings as warnings by default; `--strict` promotes them to errors.

Lint is distinct from validate: validate checks correctness (can it compile),
lint checks quality (bloat and conflicts).

### Inspect command

```txt
agentflow inspect
```

Steps:

1. Parse and validate project.
2. Print normalized IR.
3. Optionally print target preview.

## 5. Intermediate representation

The IR should be simpler than the source AST.

```ts
export interface AgentFlowProjectIR {
  name: string;
  version?: string;
  stack: string[];
  rules: RuleIR[];
  commands: Record<string, CommandIR>;
  agents: Record<string, AgentIR>;
  workflows: Record<string, WorkflowIR>;
  permissions: PermissionIR;
  outputs: OutputIR[];
  sourceFiles: SourceFileRef[];
}
```

`AgentFlowProjectIR` intentionally OMITS a `memory` field in MVP (structured
memory is later). It DOES include `outputs`.

Why have IR?

- AST preserves syntax.
- IR represents meaning.
- Emitters should consume IR, not raw syntax.

## 6. Diagnostic model

Diagnostics should include:

```ts
interface Diagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  hint?: string;
}
```

Example:

```txt
.agent/src/project.afx:18:12 error AFV001 Unknown workflow "safeEdit"
Hint: Define workflow safeEdit or remove the reference from agent Coder.
```

## 7. Target architecture (plugin/custom-target model is later — not MVP, per D3)

MVP ships a fixed set of built-in emitters (Codex, Claude, Gemini, runtime JSON, schemas); the plugin interface and user-defined customTarget(...) are post-MVP.

A target is a plugin:

```ts
interface TargetEmitter {
  name: string;
  defaultOutputPath: string | ((ir: AgentFlowProjectIR) => string);
  emit(ctx: EmitContext, ir: AgentFlowProjectIR): Promise<GeneratedFile[]>;
}
```

This allows users to add custom targets:

```ts
export default defineConfig({
  targets: [
    "codex",
    "claude",
    "gemini",
    customTarget({ name: "my-local-agent" })
  ]
});
```

## 8. Generated file header

Every generated file should start with a header.

Markdown:

```md
<!--
Generated by AgentFlow.
Source: .agent/src/project.afx
Do not edit this file directly.
Run: agentflow build
-->
```

JSON:

```json
{
  "$generatedBy": "agentflow",
  "$source": [".agent/src/project.afx"],
  "$doNotEdit": true
}
```

## 9. Hashing and stale detection

Generated files should include a source hash or build metadata in `.agent/dist/build-info.json`.

```json
{
  "agentflowVersion": "0.1.0",
  "sourceHash": "sha256:...",
  "outputs": {
    "AGENTS.md": "sha256:...",
    "CLAUDE.md": "sha256:..."
  }
}
```

`agentflow check` should compare actual output to compiled output rather than trusting timestamps.

## 10. Configuration file

MVP config can be TypeScript or JSON.

Example:

```ts
import { defineConfig } from "agentflow";

export default defineConfig({
  sourceDir: ".agent/src",
  outDir: ".agent/dist",
  targets: ["codex", "claude", "gemini", "runtime"],
  generatedHeader: true
});
```

MVP can also work without config by convention.

## 11. Error handling rules

- Parser errors stop compilation.
- Validator errors stop compilation.
- Warnings do not stop by default.
- `--strict` can turn warnings into errors.
- `check` exits nonzero on stale files.
- `build` exits nonzero if any output write fails.

## 12. Extensibility

Later extension points:

- custom syntax transforms
- custom target emitters
- custom validators
- custom policy resolvers
- package registry
- language server plugins
- formatter

## 13. MVP package boundaries

Suggested MVP TypeScript modules:

```txt
src/index.ts
src/cli/main.ts
src/config/defineConfig.ts
src/fs/projectRoot.ts
src/parser/tokenize.ts
src/parser/parse.ts
src/ast/types.ts
src/validator/validateProject.ts
src/lint/lintProject.ts
src/compiler/compileProject.ts
src/emitters/codex.ts
src/emitters/claude.ts
src/emitters/gemini.ts
src/emitters/runtimeManifest.ts
src/emitters/policy.ts
src/testing/golden.ts
```
