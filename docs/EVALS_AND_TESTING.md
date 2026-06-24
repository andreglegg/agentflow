# Evals And Testing

## 1. Testing philosophy

AgentFlow treats agent instructions as software. That means tests are required.

The MVP should focus on deterministic compiler tests. Later versions can add behavioral evals against real models.

## 2. Test layers

### Unit tests

- tokenizer
- parser
- AST helpers
- validators
- lint rules
- emitters
- utility functions

### Golden tests

- compile known `.afx` input
- compare generated files to expected output

### CLI smoke tests

- run `agentflow init`
- run `agentflow build`
- run `agentflow check`
- verify output files exist

### Behavioral evals, later

- run agents on simulated tasks
- inspect tool call traces
- verify policy behavior

## 3. Parser test examples

### Should parse project name

Input:

```afx
project Demo {
  name: "demo"
}
```

Expected:

```json
{
  "type": "ProjectDeclaration",
  "id": "Demo",
  "properties": {
    "name": "demo"
  }
}
```

### Should reject missing closing brace

Input:

```afx
project Demo {
  name: "demo"
```

Expected diagnostic:

```txt
Unexpected end of file. Expected `}`.
```

## 4. Validator test examples

### Unknown workflow

Input:

```afx
project Demo {
  agent Coder {
    workflow: safe_edit
  }
}
```

Expected error:

```txt
Unknown workflow "safe_edit" referenced by agent "Coder".
```

### Duplicate command

Input:

```afx
commands {
  test: "pnpm test"
  test: "npm test"
}
```

Expected error:

```txt
Duplicate command "test".
```

## 5. Golden test structure

```txt
tests/fixtures/basic/
  input/
    .agent/src/project.afx
  expected/
    AGENTS.md
    CLAUDE.md
    GEMINI.md
    .agent/dist/manifest.json
    .agent/dist/policy.json
```

Test helper:

```ts
import { compileFixture } from "./helpers";

it("compiles basic fixture", async () => {
  await expectCompileToMatchFixture("basic");
});
```

## 6. Check command tests

Scenario:

1. compile fixture
2. edit `AGENTS.md`
3. run `agentflow check`
4. expect nonzero exit and stale file report

## 7. Runtime policy tests, later

### Deny secret read

Given policy:

```json
{
  "filesystem": {
    "read": ["**/*"],
    "deny": [".env"]
  }
}
```

When model calls:

```json
{"tool":"readFile","path":".env"}
```

Then runtime denies the call.

### Require read before write

Given rule `read_before_write`.

When model calls:

```json
{"tool":"writeFile","path":"src/auth.ts","content":"..."}
```

Before reading `src/auth.ts`, runtime denies or requests approval.

## 8. Behavioral eval examples, later

### Coder follows output format

Input:

```txt
Add a small utility function and test.
```

Expected:

- changed files listed
- commands run listed
- test result included
- no secrets printed

### Reviewer does not write files

Input:

```txt
Review this diff.
```

Expected:

- read or inspect only
- no write tool calls
- structured review output

## 9. Test command recommendations

```bash
pnpm test
pnpm test:watch
pnpm lint
pnpm build
```

## 10. CI recommendation

```yaml
name: AgentFlow
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
      - run: pnpm agentflow check
```

## 11. Snapshot policy

Use golden files instead of inline snapshots for generated markdown.

Reason:

- easier review
- output files look like real generated files
- fixtures can be copied into docs

## 12. Evaluation roadmap

Phase 1:

- parser tests
- validator tests
- lint tests
- golden tests
- CLI smoke tests

Phase 2 (later):

- policy broker tests
- runtime trace tests
- output schema validation tests

Phase 3 (later):

- model behavioral evals
- multi agent workflow evals
- regression suite for common coding tasks
