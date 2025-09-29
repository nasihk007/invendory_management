import { useQuery } from '@tanstack/react-query';
import { reportAPI } from '@/api/api';
import { ReportFilters } from '@/types/report';
import { QUERY_KEYS } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';

// Hook to get available reports
export const useAvailableReports = () => {
  return useQuery({
    queryKey: QUERY_KEYS.AVAILABLE_REPORTS,
    queryFn: () => reportAPI.getAvailableReports(),
    staleTime: 10 * 60 * 1000, // 10 minutes - reports list doesn't change often
  });
};

// Hook for low stock alerts report
export const useLowStockReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.LOW_STOCK_REPORT, filters],
    queryFn: () => reportAPI.getLowStock(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - stock levels change frequently
  });
};

// Hook for inventory valuation report
export const useInventoryValuationReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVENTORY_VALUATION, filters],
    queryFn: () => reportAPI.getInventoryValuation(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for stock movement report
export const useStockMovementReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.STOCK_MOVEMENT, filters],
    queryFn: () => reportAPI.getStockMovement(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for daily changes report
export const useDailyChangesReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DAILY_CHANGES, filters],
    queryFn: () => reportAPI.getDailyChanges(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if endpoint doesn't exist
  });
};

// Hook for sales performance report
export const useSalesPerformanceReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.SALES_PERFORMANCE, filters],
    queryFn: () => reportAPI.getSalesPerformance(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes - sales data changes less frequently
    retry: false, // Don't retry if endpoint has backend errors
  });
};

// Hook for user activity report
export const useUserActivityReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.USER_ACTIVITY, filters],
    queryFn: () => reportAPI.getUserActivity(filters),
    staleTime: 15 * 60 * 1000, // 15 minutes - user activity data is less time-sensitive
  });
};

// Hook for executive summary report
export const useExecutiveSummaryReport = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.EXECUTIVE_SUMMARY, filters],
    queryFn: () => reportAPI.getExecutiveSummary(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry if endpoint has backend errors
  });
};

// Hook for product performance report (legacy)
export const useProductPerformanceReport = (filters?: { limit?: number }) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.PRODUCT_PERFORMANCE, filters],
    queryFn: () => reportAPI.getProductPerformance(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Combined hook for multiple reports (useful for dashboard)
export const useReportsOverview = (filters?: ReportFilters) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  
  // Only fetch manager-restricted reports if user is a manager
  const lowStock = useLowStockReport(filters);
  const inventoryValue = useInventoryValuationReport(filters);
  const dailyChanges = useDailyChangesReport(filters);
  const executiveSummary = useExecutiveSummaryReport(filters);

  // For staff users, we'll provide fallback data or skip restricted reports
  const safeLowStock = isManager ? lowStock : { data: null, error: null, isLoading: false };
  const safeInventoryValue = isManager ? inventoryValue : { data: null, error: null, isLoading: false };

  return {
    lowStock: safeLowStock,
    inventoryValue: safeInventoryValue,
    dailyChanges,
    executiveSummary,
    isLoading: (isManager ? (lowStock.isLoading || inventoryValue.isLoading) : false) || 
               dailyChanges.isLoading || 
               executiveSummary.isLoading,
    hasError: isManager ? (lowStock.error || inventoryValue.error || executiveSummary.error) : executiveSummary.error,
    // Note: dailyChanges errors are ignored since the endpoint doesn't exist on backend
  };
};
