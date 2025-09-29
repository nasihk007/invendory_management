import { useQuery } from '@tanstack/react-query';
import { productAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';

export const useProductCategories = () => {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_CATEGORIES,
    queryFn: () => productAPI.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

