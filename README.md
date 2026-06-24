# AgentFlow

First version of AgentFlow.

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

## Try it locally

```bash
pnpm install
pnpm test
pnpm build
```

Run the CLI:

```bash
node dist/cli/main.js --help
```

Try it in another folder. After `pnpm build`, link the CLI once so `agentflow`
is on your `PATH`:

```bash
pnpm link --global

mkdir /tmp/agentflow-demo
cd /tmp/agentflow-demo
agentflow init
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
