export interface User {
  id: number;
  username: string;
  email: string;
  role: 'staff' | 'manager';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  expiresIn: string;
  // Note: token is at root level in the actual API response
}

export interface ProfileResponse {
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: 'staff' | 'manager';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}