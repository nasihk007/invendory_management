import { useQuery } from '@tanstack/react-query';
import { productAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';

export const useProductStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_STATS,
    queryFn: () => productAPI.getProductStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

