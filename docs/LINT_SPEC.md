# Lint Specification

## 1. Lint purpose

`agentflow lint` is the headline differentiator. It catches agent-instruction source that compiles fine but degrades agent behavior.

A `.afx` file can be perfectly valid and still be bad. It can repeat the same rule, hold two rules that contradict each other, carry empty sections, or grow so large that the generated markdown floods the model context. None of that breaks the build. All of it makes agents worse.

Lint targets bloated, contradictory, and dead instruction source. It treats the source the way a code linter treats code: not "is it wrong" but "is it good".

## 2. Lint versus validate

These are two distinct passes.

- `validate` checks correctness. Can this source compile? Is the name present, are command names unique, does the agent reference a real workflow, are the permission globs well formed? Validate failures mean the project cannot build.
- `lint` checks quality. The source compiles, but is it bloated, self-contradictory, or hollow? Lint findings mean the project builds but the output will likely degrade agent behavior.

Validate uses `AFV###` codes. Lint uses `AFL###` codes.

```bash
agentflow validate   # correctness: can it compile
agentflow lint       # quality: is it any good
```

## 3. Severity model

Lint findings are warnings by default. A clean compile with lint warnings still exits `0`.

- `--strict` promotes all warnings to errors and makes the command exit nonzero on any finding. Use this in CI.
- Each rule can be disabled per project in config.

```jsonc
// agentflow.config.json
{
  "lint": {
    "strict": false,
    "rules": {
      "AFL004": "off"
    },
    "contextBudget": {
      "maxBytes": 12000,
      "maxLines": 400
    }
  }
}
```

Allowed per-rule values: `"warn"`, `"error"`, `"off"`.

## 4. MVP lint rules

### AFL001 Duplicate rules

Two rules with identical or trivially identical text. The second adds no information and costs context.

```afx
rules {
  rule "Always run the tests before committing."
  rule "Always run the tests before committing."
}
```

### AFL002 Directly conflicting rules

Two rules that instruct the agent to do opposite things. The model gets contradictory guidance and behavior becomes unpredictable.

Concrete example pair:

```afx
rules {
  rule "Never add comments to generated code."
  rule "Always add doc comments to every function."
}
```

MVP detection is conservative: it flags pairs where one rule negates a directive the other asserts on the same subject (for example `never`/`always` on the same target phrase). It does not attempt full natural-language contradiction detection.

### AFL003 Empty sections

A declared section with no meaningful content: empty `rules {}`, empty `commands {}`, an `agent` with no `tools`, an `output` with no `include`. Empty sections are dead weight and usually signal an unfinished edit.

```afx
rules {
}
```

### AFL004 Context-budget warning

The generated markdown for a target exceeds the configured byte or line budget.

Rationale: oversized context degrades models. Past a point, more instructions lower instruction-following, bury the important rules, and raise cost and latency. The budget makes that pressure visible at build time instead of at agent-failure time.

The budget is configurable (`maxBytes`, `maxLines`) and measured per generated target file (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`). Defaults are intentionally modest; tune per project.

## 5. Diagnostic output

Lint uses the same diagnostic format as the rest of the toolchain: `file:line:col severity code message` followed by a `Hint:` line.

```txt
.agent/src/project.afx:5:3 warning AFL001 Duplicate rule: "Always run the tests before committing." repeats an earlier rule.
Hint: Remove one of the rules or merge them into a single rule.

.agent/src/project.afx:7:3 warning AFL002 Rule "Always add doc comments to every function." may directly conflict with "Never add comments to generated code." (shared subject: comments).
Hint: Keep one directive on this subject, or scope each rule so they no longer overlap.

.agent/src/project.afx:4:3 warning AFL003 Empty section "rules".
Hint: Add at least one entry or remove the empty `rules { }` block.

CLAUDE.md:1:1 warning AFL004 Generated markdown CLAUDE.md is 14820 bytes (budget 12000).
Hint: Trim or split rules, or raise lint.contextBudget.maxBytes in config.
```

With `--strict`, `warning` becomes `error` and the command exits nonzero.

## 6. Determinism

- Findings are emitted in stable order: by file, then line, then column, then rule code.
- The same source always produces the same findings in the same order.
- Lint reads source only. It does not write files and has no timestamps.

## 7. Pipeline placement

Lint runs as a diagnostics pass after validation and IR normalization, so it can inspect both the structured IR and the would-be generated markdown for the context-budget rule. It never blocks emit on its own; emit is gated only by validate (and by `--strict`, when used in CI).

## 8. Later lint rules

These are vision, not MVP:

- Negative-versus-positive constraint guidance: warn when rules over-rely on "do not" phrasing where a positive directive guides models better.
- Neutral or harmful rule detection: flag rules that add no behavioral signal, or that are known to push models toward worse output.

These require heuristics or model-assisted analysis and stay out of the deterministic MVP linter.
