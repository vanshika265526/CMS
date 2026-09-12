# MCP Server Architecture & Implementation Guide

Deep dive into the CMS MCP integration architecture, design patterns, and how to extend it.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Code Structure](#code-structure)
3. [Data Flow](#data-flow)
4. [Tool Implementation Pattern](#tool-implementation-pattern)
5. [Service Integration](#service-integration)
6. [Authentication & Security](#authentication--security)
7. [Error Handling](#error-handling)
8. [Database Access](#database-access)
9. [Extending Tools](#extending-tools)
10. [Performance Optimization](#performance-optimization)
11. [Testing](#testing)

---

## Architecture Overview

### Design Philosophy

The MCP server is designed with these principles:

1. **Single Process**: Express app hosts MCP server (no separate deployment)
2. **Shared Business Logic**: Reuses models, services, and controllers
3. **Transport Agnostic**: Works with SSE (HTTP) or stdio (CLI)
4. **Bearer Token Auth**: Simple, stateless authentication
5. **Zod Validation**: All inputs validated with type-safe schemas

### Core Components

```
┌──────────────────────────────────────────────────────┐
│           Express Application (5005)                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  MCP Server (McpServer)                     │   │
│  │  ─────────────────────────────────          │   │
│  │  • Registers 53 tools across 7 modules      │   │
│  │  • Manages tool call handlers               │   │
│  │  • Processes tool arguments                 │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                 │
│  ┌─────────────────┴───────────────────────────┐   │
│  │  SSE Transport Layer                        │   │
│  │  ─────────────────────────────────          │   │
│  │  • GET  /mcp/sse  (establish connection)    │   │
│  │  • POST /mcp/messages (handle calls)        │   │
│  │  • Bearer token auth middleware             │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                 │
│  ┌─────────────────┴───────────────────────────┐   │
│  │  Tool Modules (7 categories)                │   │
│  │  ─────────────────────────────────          │   │
│  │  • student.tools.ts                         │   │
│  │  • faculty.tools.ts                         │   │
│  │  • course.tools.ts                          │   │
│  │  • attendance.tools.ts                      │   │
│  │  • exam.tools.ts                            │   │
│  │  • fee.tools.ts                             │   │
│  │  • library.tools.ts                         │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                 │
│  ┌─────────────────┴───────────────────────────┐   │
│  │  Shared Services & Models                   │   │
│  │  ─────────────────────────────────          │   │
│  │  • Mongoose models (Student, Course, etc.)  │   │
│  │  • Service functions                        │   │
│  │  • Authentication middleware                │   │
│  │  • Database connection                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  Dashboard UI (/mcp)                        │   │
│  │  ─────────────────────────────────          │   │
│  │  • Tool browser                             │   │
│  │  • REST API runner                          │   │
│  │  • Documentation                            │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Code Structure

### File Organization

```
backend/src/mcp/
├── index.ts                    # Standalone MCP entry point (optional)
├── express.ts                  # Express integration (main)
├── auth.ts                     # Bearer token middleware
├── config.ts                   # Configuration constants
├── types.ts                    # TypeScript types & helpers
├── db.ts                       # MongoDB wrapper
├── dashboard.ts                # Dashboard UI HTML
├── helpers.ts                  # Utility functions (pagination, etc.)
│
├── tools/                      # Tool implementations (53 tools)
│   ├── student.tools.ts       # 8 student management tools
│   ├── faculty.tools.ts       # 6 faculty management tools
│   ├── course.tools.ts        # 7 course management tools
│   ├── attendance.tools.ts    # 8 attendance tracking tools
│   ├── exam.tools.ts          # 8 exam management tools
│   ├── fee.tools.ts           # 8 fee management tools
│   └── library.tools.ts       # 8 library management tools
│
├── resources/                  # MCP resources (optional)
├── prompts/                    # MCP prompts (optional)
│
├── MCP_INTEGRATION_GUIDE.md
├── MCP_ARCHITECTURE.md         # This file
└── MCP_QUICK_START.md
```

### Entry Points

#### Express Integration (Main)

```typescript
// backend/src/server.ts
import { integrateMCPWithExpress } from "./mcp/express.js";

const app = express();
integrateMCPWithExpress(app); // Mounts /mcp, /mcp/sse, /mcp/messages
```

#### Standalone Server (Optional Reference)

```bash
# Run separate MCP server
npm run mcp
```

---

## Data Flow

### Request Flow for Tool Call

```
1. CLIENT REQUEST
   ─────────────────
   GET /mcp/sse
   Headers: Authorization: Bearer <SECRET>

   │
   ▼

2. AUTH MIDDLEWARE
   ─────────────────
   auth.ts: createAuthMiddleware()
   • Extract Bearer token
   • Compare with MCP_SECRET
   • Allow or reject request

   │
   ▼

3. SSE CONNECTION
   ─────────────────
   express.ts: GET /mcp/sse
   • Create SSEServerTransport
   • Connect MCP server
   • Send sessionId to client

   │
   ▼

4. TOOL CALL
   ─────────────────
   POST /mcp/messages?sessionId=<ID>
   Body: {
     "method": "tools/call",
     "params": {
       "name": "student_list",
       "arguments": { "limit": 5 }
     }
   }

   │
   ▼

5. TOOL EXECUTION
   ─────────────────
   tools/*.ts: server.tool() handler
   • Validate args with Zod schema
   • Call MongoDB (direct DB access)
   • Format response

   │
   ▼

6. RESPONSE
   ─────────────────
   Stream result back via SSE
   {
     "jsonrpc": "2.0",
     "result": {
       "success": true,
       "data": [...]
     }
   }
```

### Direct Service Access

Instead of making HTTP requests, tools call services directly:

```typescript
// ❌ OLD: HTTP request (slow, circular)
const response = await fetch("http://localhost:5005/api/students");

// ✅ NEW: Direct DB access (fast, direct)
const students = await Student.find(filter);
```

---

## Tool Implementation Pattern

### Basic Tool Structure

```typescript
server.tool(
  "tool_name", // 1. Unique identifier
  "Human-readable description", // 2. Description for UI
  {
    // 3. Input schema (Zod)
    param1: z.string().describe("..."),
    param2: z.number().optional(),
  },
  async (params) => {
    // 4. Handler function
    try {
      // Your logic here
      const result = await doSomething(params);
      return success(result); // ✅ Success response
    } catch (err: any) {
      return error(err.message); // ❌ Error response
    }
  },
);
```

### Example: student_list Tool

```typescript
server.tool(
  "student_list",
  "List and filter students by batch, department, semester, etc.",
  {
    batchId: z.string().optional(),
    department: z.string().optional(),
    semester: z.number().optional(),
    status: z.enum(["active", "graduated", "dropped"]).optional(),
    search: z.string().optional(),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(20),
  },
  async (params) => {
    try {
      // Build MongoDB filter
      const filter: any = {};
      if (params.batchId) {
        filter.batchId = toObjectId(params.batchId, "batchId");
      }
      if (params.search) {
        const regex = new RegExp(params.search, "i");
        filter.$or = [
          { "personalInfo.firstName": regex },
          { "personalInfo.lastName": regex },
          { "personalInfo.email": regex },
        ];
      }

      // Query database
      const query = Student.find(filter)
        .select("uniqueStudentId enrollmentId personalInfo...")
        .populate("academicInfo.department")
        .sort({ createdAt: -1 });

      const countQuery = Student.countDocuments(filter);

      // Paginate results
      const result = await paginate(query, countQuery, params);

      return success(result);
    } catch (err: any) {
      return error(err.message);
    }
  },
);
```

### Response Format

All tool responses follow this format:

```typescript
// Success
{
  success: true,
  data: { /* result data */ },
  pagination: { page, limit, total } // if paginated
}

// Error
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE"
}
```

---

## Service Integration

### Using Existing Services

MCP tools should call your services, not duplicate logic:

```typescript
// ❌ Don't duplicate logic
async (params) => {
  const student = await Student.findById(params.id);
  const batch = await Batch.findById(student.batchId);
  // ... more duplicate logic
  return success(result);
};

// ✅ Call existing service
import { StudentService } from "../../services/StudentService.js";
async (params) => {
  const result = await StudentService.getStudentWithBatch(params.id);
  return success(result);
};
```

### Available Services

Check `backend/src/services/` for:

- StudentService
- FacultyService
- CourseService
- AttendanceService
- ExamService
- FeeService
- LibraryService

### Creating Service Wrappers

If a service doesn't exist, create one:

```typescript
// backend/src/services/StudentService.ts
import Student from "../models/Student.js";

export const StudentService = {
  async listStudents(filter: any, pagination: any) {
    return Student.find(filter)
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .lean();
  },

  async getStudent(id: string) {
    return Student.findById(id).populate(["batchId", "department"]);
  },

  async createStudent(data: any) {
    const student = new Student(data);
    return student.save();
  },
};
```

Then use in MCP tools:

```typescript
import { StudentService } from "../../services/StudentService.js";

async (params) => {
  const students = await StudentService.listStudents(filter, pagination);
  return success(students);
};
```

---

## Authentication & Security

### Bearer Token Authentication

All SSE connections require Bearer token:

```typescript
// auth.ts
export function createAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.MCP_SECRET;
    if (!expected) return next(); // Dev mode: no auth

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };
}
```

### Production Secrets

**Generate strong secrets:**

```bash
# JWT_SECRET
openssl rand -base64 32

# MCP_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Never hardcode secrets:**

- Always use environment variables
- Rotate quarterly
- Different secrets for dev/prod

### Input Validation

All tool arguments validated with Zod:

```typescript
// Schema validation (automatic)
server.tool(
  'tool_name',
  'Description',
  {
    email: z.string().email(),           // Must be valid email
    age: z.number().min(18).max(100),   // Must be 18-100
    status: z.enum(['active', 'inactive']), // Only 2 options
  },
  // Handler only called if validation passes
  async (params) => { ... }
);

// Invalid request automatically rejected
// { error: "Invalid input: age must be >= 18" }
```

---

## Error Handling

### Error Response Pattern

```typescript
// All errors should return this format
return error("User-friendly error message");

// Examples
return error("Student not found");
return error("Invalid batch ID format");
return error("Database connection failed");
return error("Insufficient permissions");
```

### Common Error Scenarios

```typescript
// Validation error
if (!params.id) {
  return error("id parameter is required");
}

// Not found error
const student = await Student.findById(params.id);
if (!student) {
  return error("Student not found");
}

// Database error
try {
  const result = await Student.findOne(filter);
  return success(result);
} catch (err: any) {
  console.error("[MCP] Query error:", err);
  return error(`Database error: ${err.message}`);
}

// Permission error
if (!user.isAdmin && !user.isDepartmentHead) {
  return error("You do not have permission to access this data");
}
```

### Error Logging

```typescript
// Logs appear in server console
import logger from "../../utils/logger.js";

try {
  const result = await expensiveOperation();
  return success(result);
} catch (err: any) {
  logger.error("[MCP] Tool error:", {
    tool: "tool_name",
    error: err.message,
    params: params,
  });
  return error(err.message);
}
```

---

## Database Access

### Direct Mongoose Queries

Tools can access databases directly (no HTTP):

```typescript
// Using Mongoose models
const students = await Student.find({ batchId: params.batchId })
  .populate("academicInfo.department")
  .lean();

// Lean queries faster for read-only operations
const data = await Student.find(filter).lean();
```

### Pagination Helper

```typescript
// helpers.ts
export async function paginate(query: any, countQuery: any, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(params.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit),
    countQuery,
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

### Query Optimization

```typescript
// ✅ Good: Select only needed fields
Student.find(filter)
  .select("enrollmentId personalInfo.firstName academicInfo.batch")
  .lean();

// ❌ Bad: Fetch all fields
Student.find(filter);

// ✅ Good: Use indexes
// Add indexes to frequently searched fields
db.students.createIndex({ uniqueStudentId: 1 });
db.students.createIndex({ "academicInfo.batch": 1 });

// ✅ Good: Pagination
const result = await paginate(query, countQuery, params);

// ❌ Bad: Load all results
const students = await Student.find(filter);
```

---

## Extending Tools

### Adding a New Tool

1. **Add to existing module:**

```typescript
// backend/src/mcp/tools/student.tools.ts
server.tool(
  "student_new_tool",
  "Do something with students",
  {
    /* schema */
  },
  async (params) => {
    /* handler */
  },
);
```

2. **Create new module:**

```typescript
// backend/src/mcp/tools/notification.tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerNotificationTools(server: McpServer) {
  server.tool(
    "notification_send",
    "...",
    {
      /* ... */
    },
    async (params) => {
      // ...
    },
  );
}
```

3. **Register in express.ts:**

```typescript
import { registerNotificationTools } from "./tools/notification.tools.js";

function createMCPServer(): McpServer {
  const server = new McpServer({
    /* ... */
  });

  // Existing tools
  registerStudentTools(server);
  registerFacultyTools(server);
  // ...

  // New tools
  registerNotificationTools(server);

  return server;
}
```

### Tool Naming Convention

- **Prefix**: `<module>_<action>`
- Examples:
  - `student_list`, `student_get`, `student_create`
  - `faculty_list`, `faculty_assign`
  - `exam_schedule`, `exam_results`

### Parameter Naming Convention

- Use `snake_case` for parameters
- Include type in name if ambiguous:
  - `batchId` (ObjectId)
  - `studentEmail` (string)
  - `attendancePercentage` (number)

---

## Performance Optimization

### Caching

Add Redis caching for frequently accessed data:

```typescript
import redis from "redis";

const cacheKey = `students:batch:${params.batchId}`;
let students = await cache.get(cacheKey);
if (!students) {
  students = await Student.find({ batchId: params.batchId });
  await cache.set(cacheKey, students, 300); // 5 min TTL
}
return success(students);
```

### Query Timeouts

Prevent runaway queries:

```typescript
async (params) => {
  try {
    const result = await Promise.race([
      Student.find(filter),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 30000),
      ),
    ]);
    return success(result);
  } catch (err: any) {
    if (err.message === "Query timeout") {
      return error("Query took too long. Try with more specific filters.");
    }
    return error(err.message);
  }
};
```

### Batch Operations

Process large datasets in batches:

```typescript
async function processBatch(items: any[], batchSize: number = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => processItem(item)));
  }
}
```

### Database Connection Pooling

Already handled by Mongoose. Adjust if needed:

```typescript
// backend/src/config/db.ts
const mongooseOptions = {
  maxPoolSize: 10, // Connection pool size
  minPoolSize: 2,
  maxIdleTimeMS: 60000, // Close idle connections after 60s
};
```

---

## Testing

### Manual Testing

**Dashboard UI:**

```bash
npm run dev
# Open http://localhost:5005/mcp
```

**REST API:**

```bash
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{"toolName": "student_list", "args": {"limit": 5}}'
```

**SSE Connection:**

```bash
curl -H "Authorization: Bearer dev-secret" \
     http://localhost:5005/mcp/sse \
     -N
```

### Unit Testing

```typescript
// backend/src/mcp/tools/__tests__/student.tools.test.ts
import { describe, it, expect } from "@jest/globals";

describe("student_list tool", () => {
  it("should return paginated students", async () => {
    const result = await toolHandler({
      limit: 10,
      page: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
    expect(result.pagination.total).toBeGreaterThanOrEqual(0);
  });

  it("should filter by batch", async () => {
    const result = await toolHandler({
      batchId: "valid-batch-id",
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data.every((s) => s.batchId === "valid-batch-id")).toBe(true);
  });

  it("should handle invalid batch ID", async () => {
    const result = await toolHandler({
      batchId: "invalid-format",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });
});
```

### Integration Testing

```typescript
// backend/src/mcp/tools/__tests__/student.integration.test.ts
describe("Student tools integration", () => {
  it("create → list → get → update workflow", async () => {
    // 1. Create student
    const created = await toolHandler("student_create", createData);
    expect(created.success).toBe(true);
    const studentId = created.data._id;

    // 2. List students (should include new)
    const list = await toolHandler("student_list", {});
    expect(list.data.some((s) => s._id === studentId)).toBe(true);

    // 3. Get specific student
    const get = await toolHandler("student_get", { id: studentId });
    expect(get.success).toBe(true);
    expect(get.data._id).toBe(studentId);

    // 4. Update student
    const update = await toolHandler("student_update", {
      id: studentId,
      name: "Updated Name",
    });
    expect(update.success).toBe(true);
    expect(update.data.name).toBe("Updated Name");
  });
});
```

---

## Summary

### Key Takeaways

✅ **Embedded Server**: MCP runs inside Express (no separate deployment)  
✅ **Direct DB Access**: Tools call services, not HTTP APIs  
✅ **Bearer Auth**: Simple token-based security  
✅ **Shared Logic**: Reuses models, services, and utilities  
✅ **Type Safe**: Zod validates all inputs  
✅ **Extensible**: Add new tools by registering handlers  
✅ **Scalable**: Pagination, caching, timeouts, and connection pooling

### Quick Checklist for New Tools

- [ ] Create tool with `server.tool(name, description, schema, handler)`
- [ ] Validate all parameters with Zod schema
- [ ] Call services/models directly (no HTTP)
- [ ] Handle errors with `error()` helper
- [ ] Return results with `success()` helper
- [ ] Test with dashboard UI and curl
- [ ] Document in tool description
- [ ] Add to appropriate module file
- [ ] Register module in `express.ts`

---

**Last Updated:** June 27, 2026  
**SDK Version:** @modelcontextprotocol/sdk ^1.29.0
