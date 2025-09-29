import { useQuery } from '@tanstack/react-query';
import { productAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';

export const useLowStockProducts = (limit?: number) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.PRODUCT_LOW_STOCK, limit],
    queryFn: () => productAPI.getLowStockProducts(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

