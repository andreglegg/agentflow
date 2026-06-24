# AgentFlow Reconciliation Decisions (v0.1)

This is the rationale log for the v0.1 MVP reconciliation. Each entry records a
locked decision, the contradiction or risk in the original docs pack that
prompted it, and the consequence. These decisions are authoritative; all other
docs must conform.

## D1: Canonical grammar is a single nested project block

Decision: An MVP project is a SINGLE file `.agent/src/project.afx` with exactly
ONE top-level `project <Identifier> { ... }` block. All sections nest inside it.
Standalone top-level declarations and multi-file `import` projects are future.

Context: `LANGUAGE_SPEC_AFX.md` and `examples/` mixed standalone top-level
`agent`/`workflow` declarations with nested forms, and `ARCHITECTURE.md` implied
multi-file `.agent/src/*.afx` with imports — so no single shape was canonical.

Consequence: One unambiguous parse target for the MVP. The top-level/import form
must be clearly labeled "future" wherever a grammar sketch appears.

## D2: One authoritative MVP definition

Decision: Source = metadata (name required, version, stack), rules, commands,
ordered `workflow`, `agent`, `permissions`, `output`. Targets = AGENTS.md,
CLAUDE.md, GEMINI.md, manifest/policy/build-info JSON plus their schemas. CLI =
init, build, check, validate, inspect, lint. Validation, lint, and test scopes
are fixed exactly as locked.

Context: `PRODUCT_SPEC.md`, `ROADMAP.md`, and `COMPILER_SPEC.md` listed different
feature sets, CLI verbs, and output files, leaving the actual MVP surface
undefined and contradictory across docs.

Consequence: A single checklist for what "MVP" means. Any doc listing more or
fewer sections, targets, or CLI verbs is wrong and must match this entry exactly.

## D3: Demote vision features to "later"

Decision: Active runtime (`agentflow run`), structured memory, user `type`
declarations, language-level `test` blocks, package/import, Cursor target,
policy inheritance, workflow `machine` state machines, and custom target plugins
are all VISION / LATER, not MVP.

Context: `MEMORY_MODEL.md`, `RUNTIME_SPEC.md`, and `ROADMAP.md` presented these
as near-term, inflating the MVP and contradicting the trimmed scope in D2.

Consequence: These features may appear in docs only when clearly labeled
non-MVP. Keeps the buildable surface small and honest.

## D4: Enforcement honesty

Decision: Generated markdown AND policy.json are GUIDANCE/DATA, not enforcement.
They do nothing until the AgentFlow runtime (later) brokers tool calls or a host
tool chooses to read them.

Context: `SECURITY_AND_PERMISSIONS.md` and `PRODUCT_SPEC.md` user stories implied
that emitting `policy.json` and permission blocks would actually restrict the
agent — passive files cannot enforce anything.

Consequence: No doc may imply passive files enforce limits. Any enforcement
user-story must be tagged "(requires runtime — later)".

## D5: Shell policy reality

Decision: The exact-string shell allowlist is a documented KNOWN LIMITATION
(breaks on args/flags) and is guidance-only in MVP. The real (later) enforcement
model is argv-array execution (no shell, no `sh -c`) with working-directory
restriction, env-var allowlist, and per-command timeout.

Context: `SECURITY_AND_PERMISSIONS.md` described exact-string allowlisting as if
it were robust, but it fails the moment a command takes flags (e.g.
`pnpm test --watch`).

Consequence: MVP ships the allowlist with its limitation stated plainly; the
runtime spec documents the real argv-based model as the future enforcement path.

## D6: Determinism

Decision: `build-info.json` is the ONLY output allowed a timestamp (`builtAt`);
`builtAt` is excluded from `check` comparison and can be fixed/disabled via env
var for tests. All other outputs use stable key ordering, LF endings, a single
trailing newline, and no timestamps.

Context: `COMPILER_SPEC.md` and `ARCHITECTURE.md` did not constrain output
formatting, so timestamps or unstable ordering would make `check` (drift
detection) and golden tests flaky.

Consequence: Outputs are byte-reproducible, so `check` and golden tests are
reliable. The lone timestamp is quarantined and excluded from comparison.

## D7: "Structured + validated", not "typed"

Decision: The MVP pitch is "structured + validated", NOT "typed". Soften/remove
"typed" and "TypeScript for agents" claims until real user `type` declarations
ship. Reframe the headline around validation, drift-check (`check`), and lint.

Context: `PRODUCT_SPEC.md` and `README.md` marketed AgentFlow as "typed" / "the
TypeScript for agents", but no user-facing type system exists in MVP (types are
LATER per D3) — the claim oversold the product.

Consequence: Messaging matches the actual feature set, avoiding a credibility
gap. "Typed" returns only when user `type` declarations land.

## D8: CLAUDE.md import mode

Decision: Add an init/config option to emit CLAUDE.md as a THIN file that
`@imports` AGENTS.md (Claude Code supports `@path` imports) plus Claude-specific
notes, instead of duplicating content. Default may stay full emit; document both.

Context: `LLM_TARGETS.md` only described full duplication into each target file,
which causes content drift between AGENTS.md and CLAUDE.md and ignores Claude
Code's native import support.

Consequence: Users can avoid duplicated, drift-prone content. Both full and thin
modes are supported and documented.

## D9: Schemas for our outputs

Decision: Ship JSON Schema files for OUR outputs `manifest.json` and
`policy.json` (`manifest.schema.json`, `policy.schema.json`) so generated outputs
are validatable. This is the only "schema" feature in MVP.

Context: `COMPILER_SPEC.md` mentioned "schemas" ambiguously, risking confusion
with user-facing `type` declarations (LATER per D3) and leaving generated JSON
unvalidatable.

Consequence: Generated JSON is verifiable against shipped schemas. This is for
OUR output files only, not user-facing types.

## D10: IR shape

Decision: `AgentFlowProjectIR` has NO memory field in MVP (memory is later per
D3). It DOES include `outputs`. The pipeline description gains a lint/diagnostics
pass. No other IR entity changes.

Context: `ARCHITECTURE.md` / `COMPILER_SPEC.md` IR sketches included a memory
field (contradicting D3) and omitted both `outputs` and an explicit lint stage
required by D2.

Consequence: The IR matches the locked MVP scope — outputs in, memory out — and
the pipeline explicitly includes the headline lint pass.

## D11: Scaffold hygiene

Decision: Pin EXACT dependency versions in `scaffold/package.json` (no
"latest"). Rename the `tsc --noEmit` script to `typecheck`, add a real `lint`
(eslint) and `format` (prettier), pin those too, and add a `lint` command stub to
`cli/main.ts`.

Context: `scaffold/package.json` used `"latest"` deps (contradicting D6
determinism) and labeled a typecheck as "lint", so there was no honest lint step
despite lint being the headline differentiator.

Consequence: Scaffolds are reproducible and the lint/typecheck/format scripts are
named honestly, aligning the scaffold with the determinism and lint decisions.
