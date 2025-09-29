// Base report interfaces
export interface LowStockReport {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  price: number;
  value: number;
  urgency?: 'critical' | 'warning' | 'normal';
  predicted_depletion_date?: string;
}

// Actual API response types based on the curl responses
export interface LowStockApiResponse {
  dataValues: {
    id: number;
    sku: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    reorder_level: number;
    price: string;
    location: string;
    created_at: string;
    updated_at: string;
  };
  shortage_amount: number;
  urgency_score: number;
  estimated_stockout_days: number;
  recommended_order_quantity: number;
}

export interface InventoryValuationItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: string;
  total_value: number;
  reorder_level: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  low_stock_value: number;
  location: string;
  supplier: string;
}

export interface StockValueReport {
  category: string;
  total_products: number;
  total_quantity: number;
  total_value: number;
  average_price: number;
  percentage_of_total?: number;
}

export interface DailyChangesReport {
  date: string;
  day_name: string;
  total_adjustments: number;
  quantity_increased: number;
  quantity_decreased: number;
  net_change: number;
  products_affected: number;
}

export interface ProductPerformanceReport {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_quantity: number;
  total_movements: number;
  average_monthly_usage: number;
  turnover_rate: number;
  status: 'fast_moving' | 'slow_moving' | 'normal';
}

// New report types based on API response
export interface SalesPerformanceReport {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  total_sales: number;
  sales_quantity: number;
  revenue: number;
  average_selling_price: number;
  sales_trend: 'increasing' | 'decreasing' | 'stable';
  ranking: number;
  period: string;
}

export interface UserActivityReport {
  user_id: string;
  username: string;
  role: string;
  total_actions: number;
  products_managed: number;
  stock_adjustments: number;
  last_activity: string;
  productivity_score: number;
  most_active_hours: string[];
}

export interface ExecutiveSummaryReport {
  period: string;
  total_products: number;
  total_inventory_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_movements: number;
  active_users: number;
  key_metrics: {
    inventory_turnover: number;
    stock_accuracy: number;
    reorder_efficiency: number;
    user_productivity: number;
  };
  trends: {
    inventory_growth: number;
    stock_movement_trend: 'up' | 'down' | 'stable';
    user_activity_trend: 'up' | 'down' | 'stable';
  };
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    action_required: boolean;
  }>;
}

// Report configuration interfaces
export interface AvailableReport {
  name: string;
  endpoint: string;
  description: string;
  parameters: string[];
  access_level: 'manager' | 'staff';
}

export interface ReportFeatures {
  real_time_data: string;
  historical_analysis: string;
  export_integration: string;
  customizable_filters: string;
  performance_metrics: string;
}

export interface UsageGuidelines {
  date_formats: string;
  performance: string;
  caching: string;
  access_control: string;
}

export interface ReportsListResponse {
  available_reports: AvailableReport[];
  report_features: ReportFeatures;
  usage_guidelines: UsageGuidelines;
}

// Actual API Response Structures
export interface LowStockApiResponseData {
  report_type: string;
  generated_at: string;
  summary: {
    total_low_stock_items: number;
    critical_items: number;
    warning_items: number;
    categories_affected: number;
    total_estimated_shortage_value: number;
    requires_immediate_action: boolean;
  };
  urgency_ranking: LowStockApiResponse[];
  category_breakdown: any[];
  recent_notifications: any[];
  stock_predictions: any;
  action_recommendations: any[];
  urgent_items: LowStockApiResponse[];
  financial_impact: any;
  filters_applied: any;
  urgent_actions_required: number;
  export_options: any;
}

export interface InventoryValuationApiResponseData {
  report_type: string;
  generated_at: string;
  summary: {
    total_products: number;
    total_inventory_value: number;
    total_quantity: number;
    low_stock_items: number;
    out_of_stock_items: number;
    low_stock_value: number;
    average_unit_value: number;
  };
  category_breakdown: any;
  detailed_items: InventoryValuationItem[];
  recommendations: any[];
  performance_metrics: any;
  export_options: any;
}

export interface ExecutiveSummaryApiResponseData {
  executive_summary: {
    report_period: any;
    generated_at: string;
    key_metrics: {
      inventory: any;
      sales: any;
      operations: {
        total_stock_movements: number;
        net_stock_change: number;
        active_users: number;
        total_user_activities: number;
      };
      alerts: any;
    };
    performance_indicators: any;
    top_insights: any[];
    priority_actions: any[];
  };
  detailed_reports: any;
  export_options: any;
}

// Report filter parameters
export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  includeZeroValue?: boolean;
  groupByCategory?: boolean;
  includeProductDetails?: boolean;
  operationType?: string;
  roleFilter?: string;
  includePredictions?: boolean;
  urgencyThreshold?: 'critical' | 'warning' | 'normal';
  categoryFilter?: string;
  limit?: number;
}