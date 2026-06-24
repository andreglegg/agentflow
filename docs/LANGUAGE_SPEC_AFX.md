# AFX Language Specification Draft

## 1. Design goals

AFX should be:

- readable like markdown
- structured like a config language
- structured and validated
- simple enough to parse reliably
- suitable for code review
- deterministic when compiled

AFX is not meant to replace TypeScript or JSON. It is a domain specific language for agent behavior and project AI instructions.

## 2. File extension

Use `.afx`.

Example:

```txt
.agent/src/project.afx
.agent/src/agents/coder.afx        // future (multi-file) — not MVP
.agent/src/workflows/fix-bug.afx   // future (multi-file) — not MVP
```

## 3. Syntax style

> **MVP scope (D1):** A project is a SINGLE file `.agent/src/project.afx` containing exactly ONE top-level `project <Identifier> { ... }` block. For MVP, ALL blocks — metadata properties (name, version, stack), `rules`, `commands`, `workflow`, `agent`, `permissions`, `output` — are nested INSIDE that single `project { }` block. Some snippets below (sections 7–12) show these blocks standalone for readability; the standalone/top-level forms are FUTURE, not MVP. Multi-file projects and `import` are also FUTURE. See section 17 for the canonical MVP file and section 18 for the canonical grammar.

AFX uses block declarations.

```afx
project MyProject {
  name: "my-project"
  stack: ["TypeScript", "React"]

  rules {
    use_strict_typescript
    read_before_write
  }
}
```

## 4. Comments

```afx
// single line comment

/*
  block comment
*/
```

## 5. Primitive values

```afx
name: "andre-agent"
version: "0.1.0"
strict: true
max_attempts: 3
```

Supported primitives:

- string
- number
- boolean
- array
- object, later
- identifier

## 6. Project declaration

```afx
project AndreAgent {
  name: "andre-agent"
  version: "0.1.0"
  stack: ["TypeScript", "React", "Electron", "SQLite"]
}
```

There should be one main project declaration per compiled project.

## 7. Rules block

Rules are named or inline instructions.

```afx
rules {
  use_strict_typescript
  read_before_write
  prefer_small_focused_changes

  rule "Do not rewrite large files unless necessary."
  rule "After changes, report files changed and commands run."
}
```

Named rules can be mapped to target specific wording.

Inline rules are emitted as text.

## 8. Commands block

```afx
commands {
  install: "pnpm install"
  dev: "pnpm dev"
  test: "pnpm test"
  lint: "pnpm lint"
  build: "pnpm build"
}
```

Command names should be identifiers.

The compiler should recognize common names:

- install
- dev
- test
- lint
- typecheck
- format
- build

## 9. Agent declaration

```afx
agent Coder {
  purpose: "Implement code changes safely."
  tools: [readFile, writeFile, searchRepo, runCommand]
  workflow: safe_code_change

  rules {
    read_before_write
    run_tests_when_available
    output_changed_files
  }
}
```

Agents can inherit project rules and add specific rules.

## 10. Workflow declaration

Simple ordered workflow:

```afx
workflow safe_code_change {
  step understand
  step inspect
  step plan
  step edit
  step test
  step report
}
```

State machine workflow (**LATER — not MVP**, per D3):

```afx
machine CodingAgent {
  state Understand {
    on complete -> InspectFiles
  }

  state InspectFiles {
    require tool.readFile
    on enough_context -> Plan
    on missing_context -> AskOrInfer
  }

  state Edit {
    require tool.writeFile
    on complete -> Test
  }
}
```

MVP should support ordered workflows first.

## 11. Permissions block

```afx
permissions {
  filesystem {
    read: ["src/**", "tests/**", "package.json", "docs/**"]
    write: ["src/**", "tests/**", "docs/**"]
    deny: [".env", "node_modules/**", "dist/**"]
  }

  shell {
    allow: ["pnpm test", "pnpm lint", "pnpm build"]
    deny: ["rm -rf", "curl | bash", "git push --force"]
  }
}
```

MVP emits this to `.agent/dist/policy.json`. It also emits guidance in markdown.

Hard enforcement only happens in active runtime mode.

## 12. Output declaration

```afx
output DevSummary {
  include: [changed_files, commands_run, test_result, risks]
  style: concise
}
```

Later typed output:

```afx
type DevSummary {
  changed_files: string[]
  commands_run: string[]
  test_result: "pass" | "fail" | "not_run"
  risks: string[]
}
```

## 13. Memory declaration (LATER — not MVP)

Memory is **LATER — not MVP** (per D3). There is no `memory` block in MVP and the project IR has no memory field.

```afx
memory {
  read: [UserPreference, ProjectConvention, RecentDecision]
  write: [ProjectConvention, ReusableWorkflow]
  forbidden: [Secret, Credential, SensitivePersonalData]
}
```

Structured memory and runtime memory come later.

## 14. Import declaration (LATER — not MVP)

The package/import system is **LATER — not MVP** (per D3). MVP is a single-file project with no `import`.

```afx
import "@agentflow/rules/strict-typescript"
import "@agentflow/workflows/safe-code-change"
```

Relative imports:

```afx
import "./agents/coder.afx"
import "./workflows/fix-bug.afx"
```

## 15. Types (LATER — not MVP)

User-facing `type` declarations are **LATER — not MVP** (per D3). The only "schema" feature in MVP is JSON Schema files for OUR output files (`manifest.schema.json`, `policy.schema.json`), not user `type` declarations.

```afx
type FeatureSpec {
  title: string
  description: string
  acceptance_criteria: string[]
}
```

Compile to JSON Schema.

## 16. Tests (LATER — not MVP)

Language-level `test` blocks are **LATER — not MVP** (per D3).

```afx
test "coder reads before writing" {
  agent: Coder
  given: "Fix the bug in auth.ts"
  expect {
    before tool.writeFile: tool.readFile includes "auth.ts"
  }
}
```

MVP can start with golden output tests in TypeScript rather than language level test blocks.

## 17. Example complete MVP file

```afx
project RentalReviews {
  name: "rental-reviews"
  version: "0.1.0"
  stack: ["TypeScript", "React", "Vite", "Zustand", "Supabase"]

  rules {
    use_strict_typescript
    prefer_small_focused_changes
    read_before_write
    run_tests_when_available
    output_changed_files
  }

  commands {
    install: "pnpm install"
    dev: "pnpm dev"
    test: "pnpm test"
    lint: "pnpm lint"
    build: "pnpm build"
  }

  workflow safe_code_change {
    step understand
    step inspect
    step plan
    step edit
    step test
    step report
  }

  agent Coder {
    purpose: "Implement features and fixes safely."
    tools: [readFile, writeFile, searchRepo, runCommand]
    workflow: safe_code_change
  }

  agent Reviewer {
    purpose: "Review changes for correctness, architecture, and regressions."
    tools: [readFile, searchRepo, runCommand]
    workflow: safe_code_change
  }

  permissions {
    filesystem {
      read: ["src/**", "tests/**", "docs/**", "package.json"]
      write: ["src/**", "tests/**", "docs/**"]
      deny: [".env", "node_modules/**", "dist/**"]
    }

    shell {
      allow: ["pnpm test", "pnpm lint", "pnpm build"]
      deny: ["rm -rf", "curl | bash", "git push --force"]
    }
  }

  output DevSummary {
    include: [changed_files, commands_run, test_result, risks]
    style: concise
  }
}
```

## 18. Grammar sketch

This is not final EBNF, but useful for implementation.

### Canonical MVP grammar (D1)

A file is exactly ONE `project` block; all sections nest inside it.

```txt
file           := projectDecl
projectDecl    := "project" identifier "{" projectItem* "}"
projectItem    := property | rulesBlock | commandsBlock | workflowDecl
                | agentDecl | permissionsBlock | outputDecl
property       := identifier ":" value          // name (required), version, stack
rulesBlock     := "rules" "{" ruleItem* "}"
ruleItem       := bareIdentifier | ruleDecl
ruleDecl       := "rule" string
commandsBlock  := "commands" "{" property* "}"  // identifier ":" string
workflowDecl   := "workflow" identifier "{" stepDecl* "}"
stepDecl       := "step" identifier
agentDecl      := "agent" identifier "{" agentItem* "}"
agentItem      := property | rulesBlock         // purpose, tools, workflow
permissionsBlock := "permissions" "{" permGroup* "}"
permGroup      := ("filesystem" | "shell") block
outputDecl     := "output" identifier block     // include, style
block          := "{" blockItem* "}"
blockItem      := property | nestedBlock | bareIdentifier | stepDecl | ruleDecl
nestedBlock    := identifier block
value          := string | number | boolean | identifier | array
array          := "[" valueList? "]"
valueList      := value ("," value)*
```

### Future grammar (LATER — not MVP)

Standalone top-level declarations and `import` are FUTURE (per D1/D3) and are NOT part of MVP.

```txt
file           := statement*
statement      := importDecl | projectDecl | agentDecl | workflowDecl | typeDecl | testDecl
importDecl     := "import" string
agentDecl      := "agent" identifier block
workflowDecl   := "workflow" identifier block
typeDecl       := "type" identifier block
testDecl       := "test" string block
```

## 19. Parser strategy

For MVP, write a custom recursive descent parser. The syntax is small enough.

Avoid using a full parser generator until needed.

Keep tokens simple:

- identifier
- string
- number
- boolean
- punctuation
- keyword
- comment
- EOF

## 20. Formatting rules

Later, add `agentflow format`.

Initial canonical style:

- two spaces indentation
- one declaration per line
- quoted strings for text
- arrays for lists
- block declarations for major sections
