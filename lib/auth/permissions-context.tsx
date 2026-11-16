'use client';

import { createContext, use } from 'react';
import type { ReactNode } from 'react';

import type { Permission, Viewer } from '@/lib/contracts/permissions';

export type ShellViewer = Pick<Viewer, 'displayName' | 'role' | 'permissions'>;

const ViewerContext = createContext<ShellViewer | null>(null);

// UI only; the server and RLS enforce permissions.
export function PermissionsProvider({
  viewer,
  children,
}: {
  viewer: ShellViewer;
  children: ReactNode;
}) {
  return <ViewerContext value={viewer}>{children}</ViewerContext>;
}

export function useViewer(): ShellViewer {
  const viewer = use(ViewerContext);
  // Throwing beats defaulting: a missing provider must not read as "no access".
  if (!viewer) throw new Error('useViewer needs a PermissionsProvider');
  return viewer;
}

export function usePermission(p: Permission): boolean {
  return useViewer().permissions.includes(p);
}

export function Can({
  p,
  fallback = null,
  children,
}: {
  p: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return usePermission(p) ? children : fallback;
}
