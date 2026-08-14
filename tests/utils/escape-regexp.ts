/** Escapes regex-special characters so a literal path can be safely wrapped in `new RegExp()`. */
export function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
