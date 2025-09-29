import { create } from 'zustand';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('inventory_user') || 'null'),
  token: localStorage.getItem('inventory_token'),
  isAuthenticated: !!localStorage.getItem('inventory_token'),
  loading: false,
  login: (user, token) => {
    localStorage.setItem('inventory_token', token);
    localStorage.setItem('inventory_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => {
    localStorage.setItem('inventory_user', JSON.stringify(user));
    set({ user });
  },
  setLoading: (loading) => set({ loading }),
}));