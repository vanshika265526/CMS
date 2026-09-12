// MCP Server — Promise timeout guard
//
// Wraps a tool's async work so a stuck DB query can't hang an MCP client
// indefinitely. Default is configurable via MCP_TOOL_TIMEOUT_MS.

export function withTimeout<T>(
  work: Promise<T>,
  label = 'operation',
  ms = Number(process.env.MCP_TOOL_TIMEOUT_MS || 30_000)
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
