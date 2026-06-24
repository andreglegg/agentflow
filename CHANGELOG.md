# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-24

Initial MVP release.

### Added

- `.afx` source language: a single `.agent/src/project.afx` file with one
  top-level `project` block (name, version, stack, rules, commands, workflow,
  agent, permissions, output).
- Compiler pipeline: tokenizer → parser → AST → validator → IR → emitters.
- Build targets: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `.agent/dist/manifest.json`, `.agent/dist/policy.json`,
  `.agent/dist/build-info.json`, and JSON Schemas for the manifest and policy.
- CLI commands: `init`, `build`, `check`, `validate`, `inspect`, `lint`.
- `build --claude-import` to emit `CLAUDE.md` as a thin import of `AGENTS.md`.
- Validation rules (can-it-compile): missing/empty project name, multiple
  `project` blocks, duplicate command and agent names, unknown workflow
  references, malformed permission globs.
- Lint rules (quality/bloat): duplicate rules, conflicting rules, empty
  sections, and a configurable context-budget warning. Findings are warnings by
  default and errors under `--strict`.
- Deterministic output: stable key ordering, LF line endings, single trailing
  newline, and no timestamps except `build-info.json`'s `builtAt` (excluded from
  `check`, overridable via `AGENTFLOW_BUILD_TIME`).
- Test suite: tokenizer, parser, validator, lint, emitter golden, and CLI smoke
  tests.

[Unreleased]: https://github.com/andreglegg/agentflow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/andreglegg/agentflow/releases/tag/v0.1.0
