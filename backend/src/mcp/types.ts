// MCP Server — Shared TypeScript Types

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
  [key: string]: any;
}

/** Standard success response builder */
export function success(data: unknown): ToolResult {
  return {
    content: [{
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    }],
  };
}

/** Standard error response builder */
export function error(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `❌ Error: ${message}` }],
    isError: true,
  };
}
