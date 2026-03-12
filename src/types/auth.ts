export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  stripe_account_id?: string | null;
  stripe_customer_id?: string | null;
  date_joined?: string;
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
