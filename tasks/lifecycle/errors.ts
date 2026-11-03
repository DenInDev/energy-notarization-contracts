export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/[^\s)]+/g, "[endpoint]").slice(0, 1800);
}
