# Quickstart

## Install, future package

```bash
pnpm add -D agentflow
```

## Initialize

```bash
pnpm agentflow init
```

Creates:

```txt
.agent/src/project.afx
AGENTS.md
CLAUDE.md
GEMINI.md
.agent/dist/manifest.json
.agent/dist/policy.json
```

## Edit source

Edit:

```txt
.agent/src/project.afx
```

## Build

```bash
pnpm agentflow build
```

## Check in CI

```bash
pnpm agentflow check
```

## Use with LLM tools

Open your normal coding agent in the repo. The generated files are already there for the tool to read.

## Important rule

Do not edit generated files directly. Edit `.agent/src/project.afx` and rebuild.
