import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI } from '@/api/api';
import { useProductStore } from '@/store/productStore';
import { ProductFormData, ProductFilter, StockUpdate } from '@/types/product';
import { toast } from 'react-hot-toast';
import { QUERY_KEYS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';

export const useProducts = () => {
  const queryClient = useQueryClient();
  const { 
    products, 
    filters, 
    pagination, 
    setProducts, 
    setPagination, 
    addProduct, 
    updateProduct, 
    removeProduct 
  } = useProductStore();

  const productsQuery = useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, filters],
    queryFn: () => {
      // Filter out empty values to avoid backend validation errors
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => 
          value !== '' && value !== null && value !== undefined
        )
      );
      return productAPI.getProducts(cleanFilters);
    },
  });

  // Handle successful data loading
  React.useEffect(() => {
    if (productsQuery.data) {
      setProducts(productsQuery.data.data.data);
      // Convert backend meta to frontend pagination format
      const meta = productsQuery.data.data.meta;
      setPagination({
        page: meta.page,
        limit: meta.take,
        total: meta.itemCount,
        totalPages: meta.totalPages,
      });
    }
  }, [productsQuery.data, setProducts, setPagination]);
  const createProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => productAPI.createProduct(data),
    onSuccess: (response) => {
      addProduct(response.data.data.product);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success(SUCCESS_MESSAGES.PRODUCT_CREATED);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductFormData> }) => 
      productAPI.updateProduct(id, data),
    onSuccess: (response) => {
      updateProduct(response.data.data.product);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success(SUCCESS_MESSAGES.PRODUCT_UPDATED);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productAPI.deleteProduct(id),
    onSuccess: (_, id) => {
      removeProduct(id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success(SUCCESS_MESSAGES.PRODUCT_DELETED);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StockUpdate }) => 
      productAPI.updateStock(id, data),
    onSuccess: (response) => {
      updateProduct(response.data.data.product);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success(SUCCESS_MESSAGES.STOCK_UPDATED);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  return {
    products,
    filters,
    pagination,
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    updateStock: updateStockMutation.mutate,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    isUpdatingStock: updateStockMutation.isPending,
    refetch: productsQuery.refetch,
  };
};