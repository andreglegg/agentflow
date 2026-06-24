# Script Idea: Check Generated Files

The eventual `agentflow check` command should:

1. Compile source files in memory.
2. Read existing generated files from disk.
3. Compare expected content with actual content.
4. Print a clean list of stale files.
5. Exit with code 1 if anything is stale.

Suggested output:

```txt
Generated files are stale:

- AGENTS.md
- CLAUDE.md

Run `agentflow build` to update them.
```
