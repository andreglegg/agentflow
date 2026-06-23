/** Serialize a value as deterministic JSON: 2-space indent, single trailing newline. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}
