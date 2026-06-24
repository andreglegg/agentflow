# AgentFlow

[![CI](https://github.com/andreglegg/agentflow/actions/workflows/ci.yml/badge.svg)](https://github.com/andreglegg/agentflow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@aglegg/agentflow.svg)](https://www.npmjs.com/package/@aglegg/agentflow)

AgentFlow is a small CLI for keeping agent instruction files in one place.
You write one `.afx` file, then build the markdown files that different coding
agents read.

Right now it builds:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.agent/dist/manifest.json`
- `.agent/dist/policy.json`
- `.agent/dist/build-info.json`
- JSON schemas for the generated files

## Install

Install globally so the `agentflow` command is on your `PATH` (recommended):

```bash
npm install -g @aglegg/agentflow
agentflow --help
```

Prefer not to install globally? Run it on demand with `npx` instead:

```bash
npx @aglegg/agentflow --help
```

> A plain `npm install @aglegg/agentflow` (no `-g`) only adds the binary to the
> project's `node_modules/.bin`, so the bare `agentflow` command won't be on
> your `PATH` — use `npx agentflow ...` in that project, or install with `-g`.

## Quick start

```bash
mkdir my-agent && cd my-agent
agentflow init      # creates .agent/src/project.afx
agentflow build     # generates AGENTS.md, CLAUDE.md, GEMINI.md, and JSON outputs
```

Then edit `.agent/src/project.afx` and re-run `agentflow build`. Use
`agentflow check` in CI to fail when the generated files drift from the source.

## Develop from source

```bash
git clone https://github.com/andreglegg/agentflow.git
cd agentflow
pnpm install
pnpm test
pnpm build

node dist/cli/main.js --help   # run the freshly built CLI
pnpm link --global             # or link it as `agentflow` on your PATH
```

## Commands

```bash
agentflow init
agentflow build
agentflow check
agentflow validate
agentflow inspect
agentflow lint
```

## Status

This is still early. The current goal is to get the basic compiler working:
parse `.afx`, validate it, lint it, and generate stable output files.

## License

[MIT](./LICENSE) © Andre Glegg
