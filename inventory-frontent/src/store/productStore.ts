import { create } from 'zustand';
import { Product, ProductFilter } from '@/types/product';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  filters: ProductFilter;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: Partial<ProductFilter>) => void;
  setPagination: (pagination: Partial<ProductState['pagination']>) => void;
  setLoading: (loading: boolean) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: number) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedProduct: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    category: '',
    lowStock: false,
    sortBy: 'created_at',
    sortOrder: 'desc',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  setPagination: (pagination) => set({ pagination: { ...get().pagination, ...pagination } }),
  setLoading: (loading) => set({ loading }),
  addProduct: (product) => set({ products: [product, ...get().products] }),
  updateProduct: (updatedProduct) => set({
    products: get().products.map(p => p.id === updatedProduct.id ? updatedProduct : p),
    selectedProduct: get().selectedProduct?.id === updatedProduct.id ? updatedProduct : get().selectedProduct,
  }),
  removeProduct: (id) => set({
    products: get().products.filter(p => p.id !== id),
    selectedProduct: get().selectedProduct?.id === id ? null : get().selectedProduct,
  }),
}));