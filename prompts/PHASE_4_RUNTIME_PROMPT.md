# Codex Prompt: Phase 4 Runtime Alpha

Only start this after the compiler MVP is stable.

Implement a minimal active runtime for AgentFlow.

## Read first

```txt
docs/RUNTIME_SPEC.md
docs/SECURITY_AND_PERMISSIONS.md
```

## Requirements

Implement:

```txt
agentflow run <agent> <task>
```

Runtime should:

- load `.agent/dist/manifest.json`
- load `.agent/dist/policy.json`
- select agent
- construct prompt
- expose brokered tools
- enforce filesystem deny rules
- enforce shell commands via argv-array execution (no shell, no `sh -c`) with working-directory restriction, environment-variable allowlist, and per-command timeout (per D5; exact-string allowlist matching is guidance-only and must not be used as runtime enforcement)
- write trace logs

## Do not do yet

- no visual UI
- no package registry
- no general-purpose shell grammar parser (the argv-exec model above is still required)
- no autonomous background daemon

## Done when

Runtime can safely run a toy task against a fixture repo and block denied file access.
