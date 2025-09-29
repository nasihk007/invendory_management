import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter } from 'lucide-react';
import { AvailableReport, ReportFilters } from '@/types/report';
import { useReportsOverview } from '@/hooks/useReports';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import ReportsList from '@/components/reports/ReportsList';
import ReportFiltersComponent from '@/components/reports/ReportFilters';
import SalesPerformanceReport from '@/components/reports/SalesPerformanceReport';
import UserActivityReport from '@/components/reports/UserActivityReport';
import ExecutiveSummaryReport from '@/components/reports/ExecutiveSummaryReport';
import InventoryValuationReport from '@/components/reports/InventoryValuationReport';
import StockMovementReport from '@/components/reports/StockMovementReport';
import LowStockAlertsReport from '@/components/reports/LowStockAlertsReport';
import ComingSoonReport from '@/components/reports/ComingSoonReport';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

type ReportView = 'list' | 'sales' | 'user-activity' | 'executive-summary' | 'inventory-valuation' | 'stock-movement' | 'low-stock-alerts' | 'coming-soon';

const Reports: React.FC = () => {
  const [currentView, setCurrentView] = useState<ReportView>('list');
  const [selectedReport, setSelectedReport] = useState<AvailableReport | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get user role for permission handling
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  // Get overview data for the dashboard view
  const { lowStock, inventoryValue, executiveSummary, isLoading } = useReportsOverview(filters);

  // Check if we have any errors (only check errors for reports the user has access to)
  const hasErrors = isManager ? (lowStock.error || inventoryValue.error || executiveSummary.error) : executiveSummary.error;

  const handleSelectReport = (report: AvailableReport) => {
    setSelectedReport(report);
    
    // Map report endpoints to view types
    switch (report.endpoint) {
      case '/api/reports/sales-performance':
        setCurrentView('sales');
        break;
      case '/api/reports/user-activity':
        setCurrentView('user-activity');
        break;
      case '/api/reports/executive-summary':
        setCurrentView('executive-summary');
        break;
      case '/api/reports/inventory-valuation':
        setCurrentView('inventory-valuation');
        break;
      case '/api/reports/stock-movement':
        setCurrentView('stock-movement');
        break;
      case '/api/reports/low-stock-alerts':
        setCurrentView('low-stock-alerts');
        break;
      default:
        // For unimplemented reports, show coming soon page
        setCurrentView('coming-soon');
        break;
    }
  };

  const handleExportReport = async (report: AvailableReport) => {
    try {
      // Map report names to export functions
      switch (report.name.toLowerCase()) {
        case 'low stock alerts':
          // Use the bulk export API for low stock report
          const { bulkAPI } = await import('@/api/api');
          const response = await bulkAPI.exportLowStockReport({ includeOutOfStock: true });
          
          // Download the file
          const { download_info } = response.data.data;
          const link = document.createElement('a');
          link.href = download_info.download_url;
          link.download = download_info.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast.success('Low stock report exported successfully');
          break;
        
        case 'inventory valuation':
          // Use the bulk export API for inventory summary
          const { bulkAPI: bulkAPI2 } = await import('@/api/api');
          const response2 = await bulkAPI2.exportInventorySummary();
          
          // Download the file
          const { download_info: downloadInfo2 } = response2.data.data;
          const link2 = document.createElement('a');
          link2.href = downloadInfo2.download_url;
          link2.download = downloadInfo2.filename;
          document.body.appendChild(link2);
          link2.click();
          document.body.removeChild(link2);
          
          toast.success('Inventory summary exported successfully');
          break;
        
        default:
          toast(`Export functionality for ${report.name} is coming soon`, {
            icon: 'ℹ️',
            duration: 4000,
          });
          break;
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || `Failed to export ${report.name}`);
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedReport(null);
  };

  const handleApplyFilters = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setShowFilters(false);
  };

  // If we're viewing a specific report, render that component
  if (currentView !== 'list') {
    switch (currentView) {
      case 'sales':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales Performance Report</h1>
                <p className="text-gray-600">Detailed sales analysis and trends</p>
              </div>
            </motion.div>
            <SalesPerformanceReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );
      
      case 'user-activity':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Activity Report</h1>
                <p className="text-gray-600">User productivity and activity analysis</p>
              </div>
            </motion.div>
            <UserActivityReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );
      
      case 'executive-summary':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Executive Summary</h1>
                <p className="text-gray-600">Comprehensive business overview</p>
              </div>
            </motion.div>
            <ExecutiveSummaryReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );

      case 'inventory-valuation':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation Report</h1>
                <p className="text-gray-600">Complete financial valuation of current inventory</p>
              </div>
            </motion.div>
            <InventoryValuationReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );

      case 'stock-movement':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Movement Report</h1>
                <p className="text-gray-600">Detailed stock movement analysis by operation type</p>
              </div>
            </motion.div>
            <StockMovementReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );

      case 'low-stock-alerts':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="outline"
                onClick={handleBackToList}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Low Stock Alerts Report</h1>
                <p className="text-gray-600">Critical stock alerts with urgency prioritization</p>
              </div>
            </motion.div>
            <LowStockAlertsReport 
              filters={filters} 
              onExport={() => selectedReport && handleExportReport(selectedReport)}
            />
          </div>
        );
      
      case 'coming-soon':
        return (
          <ComingSoonReport 
            reportName={selectedReport?.name || 'Report'}
            onBack={handleBackToList}
          />
        );
    }
  }

  // Default view - Reports list with overview dashboard
  
  // Extract data from API responses (frontend receives double-nested structure)
  const inventoryValueData = (isManager && !inventoryValue.isLoading && !inventoryValue.error && inventoryValue.data) 
    ? (inventoryValue.data as any)?.data?.data?.detailed_items || []
    : [];
    
  const executiveSummaryData = (!executiveSummary.isLoading && !executiveSummary.error && executiveSummary.data)
    ? (executiveSummary.data as any)?.data?.data?.executive_summary || null
    : null;

  const lowStockData = (isManager && !lowStock.isLoading && !lowStock.error && lowStock.data)
    ? (lowStock.data as any)?.data?.data || null
    : null;

  // Calculate metrics from extracted data
  const calculatedTotalValue = inventoryValueData.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.total_value) || 0);
  }, 0);
  
  const summaryTotalValue = (isManager && !inventoryValue.isLoading && !inventoryValue.error && inventoryValue.data)
    ? (inventoryValue.data as any)?.data?.data?.summary?.total_inventory_value || 0
    : 0;
  const totalValue = calculatedTotalValue > 0 ? calculatedTotalValue : summaryTotalValue;
  
  const totalProducts = (isManager && !inventoryValue.isLoading && !inventoryValue.error && inventoryValue.data)
    ? (inventoryValue.data as any)?.data?.data?.summary?.total_products || 0
    : 0;
  
  const lowStockCount = isManager ? (lowStockData?.summary?.total_low_stock_items || 0) : 0;
  const stockMovements = executiveSummaryData?.key_metrics?.operations?.total_stock_movements || 0;


  // Show error message if there are API errors
  if (hasErrors && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading reports data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the reports data. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">
          Comprehensive insights into your inventory performance
        </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            Filters
          </Button>
        </div>
      </motion.div>

      {/* Quick Overview Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Overview</h2>
          {isManager ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        formatNumber(totalProducts)
                      )}
                </div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    formatNumber(lowStockCount)
                  )}
                </div>
                <div className="text-sm text-gray-600">Low Stock Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        formatCurrency(totalValue)
                      )}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                    formatNumber(stockMovements)
                      )}
                </div>
                <div className="text-sm text-gray-600">Stock Movements</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Access</h3>
                <p className="text-gray-600">
                  As a staff member, you have access to basic reports. 
                  <br />
                  Contact your manager for access to detailed inventory analytics.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          formatNumber(stockMovements)
                        )}
                  </div>
                  <div className="text-sm text-gray-600">Stock Movements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    ✓
                  </div>
                  <div className="text-sm text-gray-600">Available Reports</div>
                </div>
              </div>
            </div>
          )}
        </Card>
        </motion.div>

      {/* Reports List */}
      <ReportsList 
        onSelectReport={handleSelectReport}
        onExportReport={handleExportReport}
      />

      {/* Filters Modal */}
      {showFilters && (
        <ReportFiltersComponent
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          currentFilters={filters}
        />
      )}
    </div>
  );
};

export default Reports;