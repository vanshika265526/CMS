// MCP Server — Factory
//
// Single source of truth for building a fully-configured McpServer with every
// tool registered. Used by:
//   - express.ts  (Streamable HTTP + legacy SSE, embedded in the main app)
//   - index.ts    (standalone stdio transport for desktop clients)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerStudentTools } from './tools/student.tools.js';
import { registerFacultyTools } from './tools/faculty.tools.js';
import { registerCourseTools } from './tools/course.tools.js';
import { registerAttendanceTools } from './tools/attendance.tools.js';
import { registerExamTools } from './tools/exam.tools.js';
import { registerFeeTools } from './tools/fee.tools.js';
import { registerLibraryTools } from './tools/library.tools.js';
import { registerAuthTools } from './tools/auth.tools.js';
import { registerSystemTools } from './tools/system.tools.js';
import { registerApiKeyTools } from './tools/apikey.tools.js';
import { secureServer } from './security/secureServer.js';

export const SERVER_INFO = {
  name: 'cms-mcp',
  version: '3.0.0',
};

/** Build a fresh MCP server with all CMS tools registered and secured. */
export function createMCPServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  // Domain modules (direct Mongoose model access — reuse the data layer).
  registerStudentTools(server);
  registerFacultyTools(server);
  registerCourseTools(server);
  registerAttendanceTools(server);
  registerExamTools(server);
  registerFeeTools(server);
  registerLibraryTools(server);

  // Cross-cutting modules (auth/user/dashboard/search — reuse controllers).
  registerAuthTools(server);
  registerSystemTools(server);
  registerApiKeyTools(server);

  // Secure tools/call (authz → sanitize → timeout → audit) and filter
  // tools/list discovery by the caller's permissions. Must run AFTER all tools
  // are registered (it wraps the now-installed request handlers).
  secureServer(server);

  return server;
}
