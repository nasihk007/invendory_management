export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  reorder_level: number;
  price: string; // Backend returns price as string
  location: string;
  created_at: string;
  updated_at: string;
  status: {
    is_low_stock: boolean;
    is_out_of_stock: boolean;
    stock_level: 'low' | 'normal';
    total_value: string; // Backend returns total_value as string
  };
}

export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  reorder_level: number;
  price: number; // Frontend sends as number, backend converts to string
  location: string;
}

export interface ProductFilter {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page?: number; // Backend uses page (1-based)
  limit?: number;
  sortBy?: keyof Product;
  sortOrder?: 'asc' | 'desc';
}

export interface StockUpdate {
  quantity: number;
  reason: string;
  operation_type: 'manual_adjustment' | 'sale' | 'purchase' | 'damage' | 'transfer' | 'correction';
}

export interface CsvProductRow {
  sku: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  reorder_level: number;
  price: number;
  location?: string;
  // Validation fields
  rowIndex?: number;
  isValid?: boolean;
  errors?: string[];
}