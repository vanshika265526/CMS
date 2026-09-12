// MCP Server — Permission model (RBAC + OAuth scopes)
//
// One vocabulary serves three things:
//   1. OAuth scopes a client may request/be granted.
//   2. The permissions each role implicitly holds (role → permission matrix).
//   3. The permission each tool requires before it may execute.
//
// Effective permission = (role permissions) ∩ (granted OAuth scopes, if any).
// A login JWT (no scopes) gets the full role permission set. The service token
// and SUPER_ADMIN hold the wildcard '*'.

/** The full scope/permission vocabulary advertised via OAuth discovery. */
export const SCOPES = [
  'students.read', 'students.write', 'students.delete',
  'faculty.read', 'faculty.write',
  'courses.read', 'courses.write',
  'attendance.read', 'attendance.write',
  'exams.read', 'exams.write',
  'fees.read', 'fees.write',
  'library.read', 'library.write',
  'users.read', 'users.write', 'users.delete',
  'dashboard.read',
  'audit.read',
  'search.read',
  'settings.read',
  'profile.read', 'profile.write',
  'media.upload',
] as const;

export type Scope = (typeof SCOPES)[number];

/** Wildcard permission: holder may do anything. */
export const ALL: '*' = '*';

/**
 * Role → permission matrix, mapped onto the CMS's REAL roles.
 *   SUPER_ADMIN / COLLEGE_ADMIN → admin (full; college admins are college-scoped
 *                                 by the tools themselves)
 *   TEACHER    → editor (read broadly; write academic content)
 *   LIBRARIAN  → manager of the library domain
 *   STUDENT    → viewer (read own academic data)
 *   PARENT     → viewer (read child's academic data)
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [ALL],
  COLLEGE_ADMIN: [ALL],
  ADMIN: [ALL],
  SERVICE: [ALL],
  TEACHER: [
    'students.read', 'faculty.read', 'courses.read',
    'attendance.read', 'attendance.write',
    'exams.read', 'exams.write',
    'library.read', 'dashboard.read', 'search.read',
    'profile.read', 'profile.write', 'settings.read', 'media.upload',
  ],
  LIBRARIAN: [
    'library.read', 'library.write', 'students.read',
    'search.read', 'dashboard.read',
    'profile.read', 'profile.write', 'settings.read',
  ],
  STUDENT: [
    'profile.read', 'profile.write',
    'attendance.read', 'exams.read', 'fees.read',
    'courses.read', 'library.read', 'search.read', 'settings.read',
  ],
  PARENT: [
    'profile.read',
    'attendance.read', 'exams.read', 'fees.read',
    'search.read', 'settings.read',
  ],
};

// ── Tool → required permission ────────────────────────────────────────────────
// Tools are named "<resource>_<verb>". We map the resource prefix to a scope
// family and infer read/write/delete from the verb, with explicit overrides for
// special cases. This scales to all tools without hand-listing each one.

const RESOURCE_FAMILY: Record<string, string> = {
  student: 'students', admission: 'students',
  faculty: 'faculty',
  course: 'courses', subject: 'courses', categories: 'courses',
  attendance: 'attendance',
  exam: 'exams', result: 'exams', marks: 'exams', hallticket: 'exams',
  fee: 'fees', payment: 'fees',
  library: 'library', book: 'library',
  user: 'users',
  dashboard: 'dashboard',
  recent: 'audit',
  search: 'search',
  settings: 'settings',
};

const WRITE_VERB = /(create|add|record|checkout|issue|enroll|assign|schedule|adjust|generate|upload|import|update|edit|set|change|approve|reject|status|return|renew|pay|submit)/i;
const DELETE_VERB = /(delete|remove|revoke|destroy)/i;

/** Tools callable WITHOUT authentication (discovery + login + OAuth bootstrap). */
export const PUBLIC_TOOLS = new Set<string>(['auth_login']);

/** Explicit overrides where the heuristic would be wrong. */
const TOOL_OVERRIDES: Record<string, string[]> = {
  auth_login: [],                       // public
  auth_profile: ['profile.read'],
  auth_change_password: ['profile.write'],
  user_delete: ['users.delete'],
  student_delete: ['students.delete'],
  recent_activity: ['audit.read'],
  dashboard_stats: ['dashboard.read'],
  search_global: ['search.read'],
  categories_get: ['courses.read'],
  settings_get: ['settings.read'],
  apikey_create: ['users.write'],
  apikey_list: ['users.read'],
  apikey_revoke: ['users.write'],
};

/** Required permissions for a tool. Empty array → public (no permission needed). */
export function requiredPermissions(toolName: string): string[] {
  if (TOOL_OVERRIDES[toolName]) return TOOL_OVERRIDES[toolName];

  const [prefix, ...rest] = toolName.split('_');
  const verb = rest.join('_');
  const family = RESOURCE_FAMILY[prefix];
  if (!family) return ['profile.read']; // unknown tool → require auth at minimum

  let action: 'read' | 'write' | 'delete' = 'read';
  if (DELETE_VERB.test(verb)) action = 'delete';
  else if (WRITE_VERB.test(verb)) action = 'write';

  // Families without a discrete delete scope fall back to write.
  const scope = `${family}.${action}`;
  if (!SCOPES.includes(scope as Scope)) {
    return [`${family}.${action === 'delete' ? 'write' : action}`];
  }
  return [scope];
}

export function isPublicTool(toolName: string): boolean {
  return PUBLIC_TOOLS.has(toolName) || requiredPermissions(toolName).length === 0;
}

/** Resolve the full permission set a role implicitly holds. */
export function permissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[String(role || '').toUpperCase()] || [];
}

/** Does a permission set satisfy ALL of the required permissions? */
export function permitsAll(held: Set<string>, required: string[]): boolean {
  if (held.has(ALL)) return true;
  return required.every((r) => held.has(r));
}
