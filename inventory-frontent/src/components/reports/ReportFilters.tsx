import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { ReportFilters as ReportFiltersType } from '@/types/report';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Card from '@/components/common/Card';

interface ReportFiltersProps {
  onApplyFilters: (filters: ReportFiltersType) => void;
  onClearFilters: () => void;
  currentFilters?: ReportFiltersType;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  onApplyFilters,
  onClearFilters,
  currentFilters = {}
}) => {
  const [filters, setFilters] = useState<ReportFiltersType>(currentFilters);

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    setFilters({});
    onClearFilters();
  };

  const updateFilter = (key: keyof ReportFiltersType, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Report Filters</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              icon={<X className="w-4 h-4" />}
            >
              Close
            </Button>
          </div>

          <div className="space-y-6">
            {/* Date Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="From Date"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="To Date"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Category</h3>
              <Input
                label="Category Filter"
                placeholder="Enter category name"
                value={filters.categoryFilter || ''}
                onChange={(e) => updateFilter('categoryFilter', e.target.value)}
              />
            </div>

            {/* Operation Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Operation Type</h3>
              <select
                value={filters.operationType || ''}
                onChange={(e) => updateFilter('operationType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Operations</option>
                <option value="manual_adjustment">Manual Adjustment</option>
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
                <option value="damage">Damage</option>
                <option value="transfer">Transfer</option>
                <option value="correction">Correction</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">User Role</h3>
              <select
                value={filters.roleFilter || ''}
                onChange={(e) => updateFilter('roleFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Roles</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {/* Urgency Threshold */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Urgency Threshold</h3>
              <select
                value={filters.urgencyThreshold || ''}
                onChange={(e) => updateFilter('urgencyThreshold', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Options</h3>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeZeroValue || false}
                  onChange={(e) => updateFilter('includeZeroValue', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include Zero Value Items</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.groupByCategory || false}
                  onChange={(e) => updateFilter('groupByCategory', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Group by Category</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeProductDetails || false}
                  onChange={(e) => updateFilter('includeProductDetails', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include Product Details</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includePredictions || false}
                  onChange={(e) => updateFilter('includePredictions', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include Predictions</span>
              </label>
            </div>

            {/* Limit */}
            <div>
              <Input
                label="Limit Results"
                type="number"
                placeholder="Number of results to return"
                value={filters.limit?.toString() || ''}
                onChange={(e) => updateFilter('limit', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={handleClear}>
                Clear All
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ReportFilters;
