// src/lib/authTypes.ts
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