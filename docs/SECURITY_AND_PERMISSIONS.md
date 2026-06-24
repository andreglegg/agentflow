# Security And Permissions

## 1. Core idea

Markdown can guide an LLM. It cannot fully enforce safety.

AgentFlow must separate:

- guidance: emitted into markdown files
- policy: emitted into machine readable JSON
- enforcement: performed only by active runtime or external host tool

Both generated markdown and `policy.json` are guidance/data, NOT enforcement. `policy.json` is inert: it does nothing on its own and enforces nothing until either the AgentFlow runtime (later) brokers tool calls or a host tool chooses to read it. Passive files cannot enforce limits.

## 2. Security goals

- prevent accidental secret exposure
- prevent destructive file changes
- prevent unrestricted shell execution
- make permissions reviewable in git
- make policy output deterministic
- support least privilege per agent

## 3. Permission layers

### Project permissions

Default permissions for all agents.

### Agent permissions

Overrides or restrictions for a specific agent.

### Runtime permissions

Actual enforced policy when running through AgentFlow runtime.

### Host tool permissions

Permissions of tools like Codex, Claude Code, Gemini CLI, Cursor, or local shells.

AgentFlow can generate guidance for host tools, but cannot enforce host tool behavior unless host tool integrates with AgentFlow or the user runs through AgentFlow runtime.

## 4. Filesystem permission schema

```json
{
  "filesystem": {
    "read": ["src/**", "tests/**", "docs/**", "package.json"],
    "write": ["src/**", "tests/**", "docs/**"],
    "deny": [".env", ".env.*", "node_modules/**", "dist/**", ".git/**"]
  }
}
```

## 5. Filesystem enforcement rules (runtime — later)

These rules describe how the AgentFlow runtime (later) or an integrating host tool will enforce filesystem access; the generated `policy.json` itself enforces nothing.

- Normalize path before checking.
- Resolve path relative to project root.
- Deny absolute paths by default.
- Deny path traversal with `..` outside root.
- Deny wins over read or write allow.
- Treat symlinks carefully.
- Never allow writes to `.git` by default.
- Never allow writes to dependency directories by default.

## 6. Shell permission schema

```json
{
  "shell": {
    "allow": [
      "pnpm test",
      "pnpm lint",
      "pnpm build"
    ],
    "deny": [
      "rm -rf",
      "curl | bash",
      "git push --force",
      "sudo"
    ]
  }
}
```

## 7. Shell policy (MVP — guidance only, no enforcement)

Use exact command matching only.

This is safer than trying to parse arbitrary shell.

Allowed:

```bash
pnpm test
```

Blocked:

```bash
pnpm test && rm -rf src
```

> **Known limitation (MVP):** exact-string matching is guidance-only and brittle. It breaks the moment a command carries args or flags — for example `pnpm test --watch` will not match an allowlisted `pnpm test`. Do not rely on it for enforcement.

The real (later) enforcement model executes via an argv array — no shell, no `sh -c` — with a restricted working directory, an environment-variable allowlist, and a per-command timeout, instead of raw string matching:

```json
{
  "command": "pnpm",
  "args": ["test"],
  "cwd": ".",
  "timeoutMs": 120000
}
```

## 8. Secret handling

Default deny patterns:

```txt
.env
.env.*
*.pem
*.key
secrets/**
credentials/**
```

Generated markdown should include:

```md
Do not read, print, modify, or expose secrets unless the user explicitly asks and the runtime allows it.
```

Runtime should redact common secret patterns from logs.

## 9. Network policy

MVP can emit only guidance.

Later runtime policy:

```json
{
  "network": {
    "allow": false,
    "domains": []
  }
}
```

For coding agents, network access should usually be blocked unless needed.

## 10. Package install policy

Installing packages is risky because it changes lockfiles and executes scripts.

Policy example:

```json
{
  "packages": {
    "allowInstall": false,
    "requireApproval": true,
    "allowedManagers": ["pnpm"]
  }
}
```

## 11. Git policy

Default guidance:

- Do not commit unless explicitly asked.
- Do not push unless explicitly asked.
- Do not force push.
- Show diff summary before committing.

Runtime policy:

```json
{
  "git": {
    "allowCommit": false,
    "allowPush": false,
    "deny": ["push --force", "reset --hard"]
  }
}
```

## 12. Human approval

Actions that should require approval by default:

- deleting files
- modifying lockfiles
- installing dependencies
- changing permissions
- reading secrets
- running unknown shell commands
- network downloads
- git commit
- git push

## 13. Policy inheritance (later — not MVP, per D3)

Policy inheritance is a post-MVP feature; in MVP, permissions are a single project-level block with no per-agent inheritance.

Example:

```afx
permissions default {
  filesystem {
    read: ["src/**", "tests/**", "docs/**"]
    write: ["src/**", "tests/**"]
  }
}

agent Reviewer {
  permissions {
    filesystem {
      write: []
    }
  }
}
```

Reviewer can read but not write.

## 14. Policy in generated markdown

Generated markdown should not pretend it can enforce. It is guidance/data only; it cannot enforce anything on its own.

Good wording:

```md
Follow these permissions. If your host tool cannot enforce them, treat them as hard project rules and ask before crossing them.
```

## 15. Policy in runtime JSON

Runtime JSON should be precise and machine readable. Note that `policy.json` is data, NOT enforcement: it is inert until the AgentFlow runtime (later) brokers tool calls or a host tool chooses to read it.

Good:

```json
{
  "filesystem": {
    "read": ["src/**"],
    "write": ["src/**"],
    "deny": [".env"]
  }
}
```

Bad:

```json
{
  "filesystem": "Be careful"
}
```

## 16. Threat model

Potential issues:

- malicious prompt in source code or README
- command injection through package scripts
- accidental secret leakage
- destructive file operations
- agent loops
- dependency confusion
- prompt file tampering

Mitigations:

- file and shell allowlists
- generated file checks
- trace logs
- approval modes
- no secrets by default
- stale detection in CI
- restricted working directory

## 17. CI guard

Recommended CI command:

```bash
agentflow check
```

This prevents edited generated files from drifting away from source.

## 18. Security roadmap

Phase 1:

- generate policy JSON
- generate safety guidance
- validate deny patterns exist

Phase 2:

- runtime file broker
- exact shell command allowlist
- read before write rule

Phase 3:

- structured shell command parser
- approval UI
- trace redaction
- per agent policy inheritance

Phase 4:

- enterprise policy packs
- signed rule packages
- audit logs
