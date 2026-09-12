export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId?: string; // Null for Super Admin
}

export interface College {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  status: 'active' | 'inactive';
}
