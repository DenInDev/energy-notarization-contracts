// Converts an exception or other thrown value into a reportable message.
// Redacts endpoint URLs and limits the message length.
export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/[^\s)]+/g, "[endpoint]").slice(0, 1800);
}
