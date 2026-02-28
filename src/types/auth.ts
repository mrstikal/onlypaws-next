/**
 * Authentication and Authorization Types
 */

export type UserRole = 'user' | 'admin' | 'superadmin';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthState =
  | { isAuthed: false; user: null }
  | { isAuthed: true; user: AuthUser };

export type Session = {
  id: string;
  user_id: bigint;
  ip_address: string | null;
  user_agent: string | null;
  payload: string;
  last_activity: number;
};

