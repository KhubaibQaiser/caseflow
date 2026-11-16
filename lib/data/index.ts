import 'server-only';

// Switched to './supabase' in T22; signatures must stay identical.
export {
  getContact,
  getContactFacets,
  getPipelineColumn,
  searchContacts,
} from './fake';
