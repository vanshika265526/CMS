// MCP Server — Standalone entry point
//
// Runs the CMS MCP server as its own process over stdio. Use this for desktop
// MCP clients that launch a local command (e.g. Claude Desktop without a remote
// URL). The embedded HTTP transport in express.ts is the primary path for
// remote clients; this file shares the SAME tool set via createMCPServer().

import 'dotenv/config';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { connectDB } from './db.js';
import { createMCPServer } from './server.js';
import { logger } from './utils/logger.js';
import { setDefaultAuthContext } from './context.js';

async function main() {
  await connectDB();

  // stdio: the process boundary is the trust boundary, so tools run as a
  // full-trust "service" caller. (For per-user auth, use the HTTP transport
  // with a Bearer JWT.) Set as the default context since stdin-driven tool
  // calls fire outside any AsyncLocalStorage run() scope.
  setDefaultAuthContext({ user: null, role: 'SERVICE', isService: true, source: 'stdio' });

  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('stdio', 'CMS MCP server running on stdio');
}

main().catch((err) => {
  logger.error('stdio', `Fatal: ${err.message}`);
  process.exit(1);
});
