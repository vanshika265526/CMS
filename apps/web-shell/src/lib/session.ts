export type SessionUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  profilePicture?: string;
  mustChangePassword?: boolean;
  isFirstLogin?: boolean;
  [key: string]: any;
};

export const normalizeRole = (value?: string | null) => String(value || '').trim().toUpperCase();

const parseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const decodeJwtPayload = (token?: string | null) => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
    const decoded = typeof window !== 'undefined'
      ? window.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const getStoredUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null;
  return parseJson(localStorage.getItem('user'));
};

export const getSessionUser = (): SessionUser | null => {
  const token = getStoredToken();
  const storedUser = getStoredUser();
  const tokenPayload = decodeJwtPayload(token);

  if (!storedUser && !tokenPayload) return null;

  return {
    ...(storedUser || {}),
    _id: tokenPayload?.id || storedUser?._id || storedUser?.id,
    id: tokenPayload?.id || storedUser?.id || storedUser?._id,
    role: normalizeRole(tokenPayload?.role || storedUser?.role),
    tokenPayload,
  };
};

export const getRoleHomePath = (role?: string | null) => {
  const normalized = normalizeRole(role);

  if (normalized === 'SUPER_ADMIN') return '/super-admin/dashboard';
  if (normalized === 'COLLEGE_ADMIN') return '/admin';
  if (normalized === 'TEACHER') return '/teacher';
  if (normalized === 'LIBRARIAN') return '/librarian';
  return '/';
};

export const setPortalNotice = (message: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('portal_notice', message);
};

export const consumePortalNotice = () => {
  if (typeof window === 'undefined') return null;
  const message = localStorage.getItem('portal_notice');
  if (message) {
    localStorage.removeItem('portal_notice');
  }
  return message;
};

export const isAccessAllowed = (role: string | null | undefined, pathname: string) => {
  const normalized = normalizeRole(role);

  if (!normalized) return true;
  if (pathname.startsWith('/super-admin')) return normalized === 'SUPER_ADMIN';
  if (pathname.startsWith('/admin')) return normalized === 'SUPER_ADMIN' || normalized === 'COLLEGE_ADMIN';
  if (pathname.startsWith('/teacher')) return normalized === 'TEACHER';
  if (pathname.startsWith('/librarian')) return normalized === 'LIBRARIAN';
  // Students can access their own materials
  if (pathname === '/academics/materials') return normalized === 'STUDENT';
  // Parents cannot access academics routes (teacher materials/admin content)
  if (pathname.startsWith('/academics')) return normalized === 'SUPER_ADMIN' || normalized === 'COLLEGE_ADMIN' || normalized === 'TEACHER' || normalized === 'STUDENT';
  if (pathname.startsWith('/student')) return normalized === 'STUDENT';
  // Parents can view timetable, attendance, results, fees, and other general pages
  if (pathname === '/timetable' || pathname === '/attendance' || pathname === '/exams' || pathname.startsWith('/results')) return normalized === 'STUDENT' || normalized === 'PARENT';
  if (pathname.startsWith('/settings')) return normalized === 'STUDENT' || normalized === 'TEACHER' || normalized === 'PARENT';
  return true;
};