# Memory Model

> **STATUS: Vision / Later — NOT part of the MVP.**

## 1. Why memory needs structure

Many agent systems store memory as plain text. That is flexible but weak. It creates problems:

- stale information is hard to detect
- sensitive information can leak into prompts
- agents cannot tell explicit preferences from guesses
- project conventions mix with personal facts
- memory cannot be validated

AgentFlow should define memory as typed records with policy.

## 2. Memory categories

### UserPreference

Long lived preferences explicitly given by the user.

Example:

```json
{
  "type": "UserPreference",
  "key": "typescript.strict",
  "value": "true",
  "source": "explicit",
  "confidence": 1.0
}
```

### ProjectConvention

Rules discovered or defined for a repo.

Example:

```json
{
  "type": "ProjectConvention",
  "key": "packageManager",
  "value": "pnpm",
  "source": "package.json",
  "confidence": 1.0
}
```

### RecentDecision

A decision made during current or recent work.

Example:

```json
{
  "type": "RecentDecision",
  "key": "authProvider",
  "value": "Supabase magic link",
  "expiresAt": "2026-09-22T00:00:00.000Z"
}
```

### ReusableWorkflow

A learned project workflow.

Example:

```json
{
  "type": "ReusableWorkflow",
  "name": "release-ios-game",
  "steps": ["build", "test", "archive", "upload"]
}
```

## 3. Memory declaration in AFX

```afx
memory {
  read: [UserPreference, ProjectConvention, RecentDecision]
  write: [ProjectConvention, ReusableWorkflow]
  forbidden: [Secret, Credential, SensitivePersonalData]
}
```

## 4. Memory access by agent

```afx
agent Coder {
  memory {
    read: [ProjectConvention, UserPreference]
    write: [ProjectConvention]
  }
}

agent Reviewer {
  memory {
    read: [ProjectConvention]
    write: []
  }
}
```

## 5. Memory schema

Suggested base schema:

```json
{
  "id": "string",
  "type": "string",
  "key": "string",
  "value": "unknown",
  "source": "explicit | inferred | file | tool | user",
  "confidence": "number",
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "expiresAt": "date-time | null",
  "sensitivity": "public | private | sensitive | secret"
}
```

## 6. Confidence rules

- explicit user instruction has highest confidence
- project config files have high confidence
- inferred behavior has lower confidence
- stale records lose confidence over time
- conflicting memory requires resolution

## 7. Sensitivity rules

Default memory storage should avoid sensitive personal information unless explicitly allowed by user or project policy.

Memory types that should be blocked by default:

- secrets
- credentials
- private keys
- medical details
- legal details
- financial details
- precise location data

Project level technical memory is safer and more useful for MVP.

## 8. Memory outputs

This is a later / post-MVP capability. The MVP build does not emit any memory outputs (no `memory.schema.json`, no `memory-policy.json`) and does not include memory guidance in generated markdown.

Later, the compiler could emit:

```txt
.agent/dist/memory.schema.json
.agent/dist/memory-policy.json
```

Later, generated markdown could include:

```md
Use project conventions and user preferences when available. Do not invent memory. If memory is unavailable, inspect project files or ask.
```

## 9. Runtime memory operations

Later runtime tool API:

```ts
interface MemoryStore {
  search(query: MemoryQuery): Promise<MemoryRecord[]>;
  upsert(record: MemoryRecord): Promise<void>;
  forget(id: string): Promise<void>;
}
```

## 10. Memory conflict handling

When two records conflict:

1. prefer explicit over inferred
2. prefer newer over older if source quality is equal
3. prefer project local over global for project behavior
4. ask user if conflict is important

## 11. Memory storage options

MVP:

- no memory feature at all (no runtime, no compiled memory policy)

Later:

- local JSONL store
- SQLite store
- vector index for recall
- encrypted secrets store integration

## 12. Example memory policy output

```json
{
  "read": ["UserPreference", "ProjectConvention", "RecentDecision"],
  "write": ["ProjectConvention", "ReusableWorkflow"],
  "forbidden": ["Secret", "Credential", "SensitivePersonalData"],
  "rules": {
    "explicitBeatsInferred": true,
    "requireSource": true,
    "defaultExpirationDays": 180
  }
}
```
