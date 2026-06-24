# AgentFlow MVP Specification

This is the single authoritative one-page spec for the v0.1 MVP. All other
docs defer to it. See [DECISIONS.md](./DECISIONS.md) for the locked decisions
behind every line here, and [LINT_SPEC.md](./LINT_SPEC.md) for lint detail.

## 1. Headline framing

AgentFlow is a **structured + validated** source language and compiler for
agent instructions. The pitch is **validation + drift-check (`check`) + lint**,
not "typed" and not "TypeScript for agents". Real user `type` declarations are
later (see section 9).

## 2. Source language surface

A project is a SINGLE file `.agent/src/project.afx` containing exactly ONE
top-level `project <Identifier> { ... }` block. Every section is nested INSIDE
that block.

```afx
project AndreAgent {
  name: "andre-agent"          // required
  version: "0.1.0"
  stack: ["TypeScript", "React"]

  rules {
    read_before_write                       // named identifier
    rule "Report files changed and commands run."   // inline rule
  }

  commands {
    test: "pnpm test"          // identifier: string
  }

  workflow safe_code_change {  // exactly-ordered steps
    step understand
    step edit
    step report
  }

  agent Coder {
    purpose: "Implement changes safely."
    tools: [readFile, writeFile]
    workflow: safe_code_change
  }

  permissions {
    filesystem { read: ["src/**"]  write: ["src/**"]  deny: [".env"] }
    shell      { allow: ["pnpm test"]  deny: ["rm -rf"] }
  }

  output DevSummary {
    include: [changed_files, test_result]
    style: concise
  }
}
```

Standalone top-level declarations (agent/workflow outside `project`) and
multi-file projects with `import` are **future** (see section 9).

## 3. Target files written by build

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.agent/dist/manifest.json`
- `.agent/dist/policy.json`
- `.agent/dist/build-info.json`
- `.agent/dist/schemas/manifest.schema.json`
- `.agent/dist/schemas/policy.schema.json`

Cursor / `.mdc` output is later. Generated markdown and `policy.json` are
GUIDANCE/DATA, NOT enforcement: passive files enforce nothing until the
AgentFlow runtime (later) brokers tool calls or a host tool chooses to read
them.

## 4. CLI commands

- `agentflow init`
- `agentflow build`
- `agentflow check`
- `agentflow validate`
- `agentflow inspect`
- `agentflow lint`

## 5. Validation rules (correctness — can it compile)

- missing or empty project name
- more than one `project` block
- duplicate command names
- duplicate agent names
- agent references an unknown workflow
- empty or malformed permission glob strings

## 6. Lint rules (quality — bloat and conflicts)

Lint is DISTINCT from validate: validate = can-it-compile; lint =
quality/bloat/conflicts. Findings are WARNINGS by default; `--strict` promotes
them to errors.

- duplicate rules
- directly conflicting rules
- empty sections
- context-budget warning (generated markdown exceeds a configurable byte/line
  budget)

## 7. Determinism

`build-info.json` is the ONLY output allowed a timestamp (`builtAt`).
`builtAt` is EXCLUDED from `check` comparison and can be fixed/disabled via env
var for tests. All other outputs use stable key ordering, LF line endings, a
single trailing newline, and carry no timestamps.

## 8. JSON Schemas (the only MVP schema feature)

We ship JSON Schema files for OUR outputs so generated outputs are validatable:
`manifest.schema.json` and `policy.schema.json`. These describe our output
files only — they are NOT user-facing `type` declarations (those are later).

## 9. Out of scope for MVP (see Vision/Later)

- active runtime (`agentflow run`)
- structured memory model
- type/schema declarations (user `type`)
- language-level `test` blocks
- package/import system
- Cursor target
- policy inheritance
- workflow state machines (`machine`)
- custom target plugins

## 10. MVP test layers

- tokenizer/parser unit tests
- validator unit tests
- lint unit tests
- emitter golden tests
- CLI smoke tests
