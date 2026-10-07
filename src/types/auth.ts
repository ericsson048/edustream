export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'INSTITUTION_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
  email_verified?: boolean;
  stripe_account_id?: string | null;
  stripe_customer_id?: string | null;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  title?: string;
  date_joined?: string;
  institution?: string | null;
  institution_name?: string | null;
  must_change_password?: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}
