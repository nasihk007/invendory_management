import { useMutation, useQuery } from '@tanstack/react-query';
import { authAPI } from '@/api/api';
import { useAuthStore } from '@/store/authStore';
import { LoginCredentials, RegisterData } from '@/types/auth';
import { toast } from 'react-hot-toast';
import { QUERY_KEYS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';
import { useAppVisibility } from './useAppVisibility';

export const useAuth = () => {
  const { login: setAuth, logout: clearAuth, user, isAuthenticated, setUser } = useAuthStore();
  const { isAppActive } = useAppVisibility();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authAPI.login(credentials),
    onSuccess: (response) => {
      const user = response.data.data.user;
      const token = response.data.token;
      setAuth(user, token);
      toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authAPI.register(data),
    onSuccess: (response) => {
      // Auto-login after successful registration
      const user = response.data.data.user;
      const token = response.data.token;
      setAuth(user, token);
      toast.success(response.data.message || SUCCESS_MESSAGES.REGISTER_SUCCESS);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.AUTH_PROFILE,
    queryFn: () => authAPI.getProfile(),
    enabled: isAuthenticated && isAppActive,
    retry: (failureCount, error: any) => {
      // Don't retry on rate limit errors
      if (error?.response?.status === 429) {
        return false;
      }
      // Don't retry on auth errors
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchInterval: false, // Don't auto-refetch
    onSuccess: (response) => {
      setUser(response.data.data.user);
    },
    onError: (error: any) => {
      // Only clear auth on 401 errors, not on rate limits
      if (error?.response?.status === 401) {
        clearAuth();
      }
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<typeof user>) => authAPI.updateProfile(data),
    onSuccess: (response) => {
      setUser(response.data.data.user);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      authAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const logout = () => {
    clearAuth();
    toast.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
  };

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    changePasswordMutation,
    logout,
    isLogging: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isLoadingProfile: profileQuery.isLoading,
  };
};