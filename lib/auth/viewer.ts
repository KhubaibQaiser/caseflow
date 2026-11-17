import 'server-only';

// The app imports from here; the fake `fake-role` viewer is gone (T22a).
export {
  assertPermission,
  getViewer,
  NoProfileError,
  requirePermission,
} from './viewer-supabase';
