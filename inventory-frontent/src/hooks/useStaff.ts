import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { staffAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';
import { StaffFilters, CreateStaffRequest } from '@/types/staff';

// Hook to get all staff members
export const useStaff = (filters?: StaffFilters) => {
  // Filter out empty search values to avoid validation errors
  const cleanFilters = filters ? {
    ...filters,
    // Only include search if it has a value (not empty or just whitespace)
    ...(filters.search && filters.search.trim() ? { search: filters.search.trim() } : {}),
  } : undefined;

  // Remove search field entirely if it's empty
  if (cleanFilters && 'search' in cleanFilters && (!cleanFilters.search || cleanFilters.search.trim() === '')) {
    delete cleanFilters.search;
  }

  const query = useQuery({
    queryKey: [...QUERY_KEYS.STAFF, cleanFilters],
    queryFn: () => staffAPI.getStaff(cleanFilters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};

// Hook to get staff member details
export const useStaffDetails = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.STAFF_DETAILS(id),
    queryFn: () => staffAPI.getStaffDetails(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to create staff member
export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffRequest) => staffAPI.createStaff(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAFF });
      toast.success(`Staff member "${response.data.data.user.username}" created successfully!`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create staff member';
      toast.error(message);
    },
  });
};


// Combined hook for staff management operations
export const useStaffManagement = (filters?: StaffFilters) => {
  const staff = useStaff(filters);
  const createStaff = useCreateStaff();



  return {
    // Data - Based on actual API response structure (Axios wraps the response)
    staff: (staff.data as any)?.data?.data?.staff_members || [],
    summary: (staff.data as any)?.data?.data?.summary,
    pagination: (staff.data as any)?.data?.data?.pagination,
    
    // Loading states
    isLoading: staff.isLoading,
    isCreating: createStaff.isPending,
    
    // Error states
    error: staff.error,
    createError: createStaff.error,
    
    // Actions
    createStaff: createStaff.mutate,
    
    // Async actions
    createStaffAsync: createStaff.mutateAsync,
  };
};
