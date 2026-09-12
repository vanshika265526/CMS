// MCP Server — Structured logger
//
// Writes to stderr (stdout is reserved for the stdio MCP transport's JSON-RPC
// frames — logging to stdout would corrupt that stream). Never logs tokens,
// passwords, or secrets; callers must redact before passing values in.

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const lvl = (process.env.MCP_LOG_LEVEL || 'info').toLowerCase() as Level;
  return LEVELS[lvl] ?? LEVELS.info;
}

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  if (LEVELS[level] < threshold()) return;
  const ts = new Date().toISOString();
  const base = `[${ts}] [MCP:${scope}] ${level.toUpperCase()} ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console.error(base, safe(meta));
  } else {
    // eslint-disable-next-line no-console
    console.error(base);
  }
}

/** Shallow-redact common secret keys before logging metadata. */
function safe(meta: unknown): unknown {
  if (!meta || typeof meta !== 'object') return meta;
  const redactKeys = /token|secret|password|authorization|jwt|apikey|api_key/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    out[k] = redactKeys.test(k) ? '***redacted***' : v;
  }
  return out;
}

export const logger = {
  debug: (scope: string, msg: string, meta?: unknown) => emit('debug', scope, msg, meta),
  info: (scope: string, msg: string, meta?: unknown) => emit('info', scope, msg, meta),
  warn: (scope: string, msg: string, meta?: unknown) => emit('warn', scope, msg, meta),
  error: (scope: string, msg: string, meta?: unknown) => emit('error', scope, msg, meta),
};
