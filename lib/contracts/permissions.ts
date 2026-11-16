export const ROLES = ['admin', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'contacts.read',
  'contacts.write',
  'contacts.delete',
  'notes.write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  viewer: ['contacts.read'],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  viewer: 'Viewer',
};

export type Viewer = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  permissions: Permission[];
};
