# Codex Prompt: Phase 1 Parser

Implement the tokenizer and parser for AgentFlow `.afx` files.

## Read first

```txt
docs/LANGUAGE_SPEC_AFX.md
docs/ARCHITECTURE.md
examples/src/project.afx
```

## Requirements

Implement:

```txt
src/parser/tokenize.ts
src/parser/parse.ts
src/ast/types.ts
src/diagnostics/types.ts
```

Support:

- identifiers
- strings
- numbers
- booleans
- arrays
- block declarations
- properties
- comments
- source locations

Do not implement imports — the package/import system is post-MVP (per D1/D3).

## Tests

Add tests for:

- valid project file
- nested blocks
- arrays
- comments
- missing brace
- invalid token
- unterminated string

## Done when

`pnpm test` passes and the parser can parse `examples/src/project.afx`.
