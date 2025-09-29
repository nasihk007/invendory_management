import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  Mail,
  User,
  Shield
} from 'lucide-react';
import { Staff, StaffFilters } from '@/types/staff';
import { formatDate, formatNumber } from '@/utils/formatters';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface StaffListProps {
  staff: Staff[];
  summary?: {
    total_staff: number;
    active_staff: number;
    inactive_staff?: number;
    new_this_month: number;
    staff_with_recent_activity?: number;
  };
  pagination?: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  isLoading?: boolean;
  filters: StaffFilters;
  onFiltersChange: (filters: StaffFilters) => void;
  onViewStaff: (staff: Staff) => void;
}

const StaffList: React.FC<StaffListProps> = ({
  staff,
  summary,
  pagination,
  isLoading,
  filters,
  onFiltersChange,
  onViewStaff,
}) => {
  const [showFilters, setShowFilters] = useState(false);


  const handleSearch = (value: string) => {
    const trimmedValue = value.trim();
    const newFilters = { ...filters, offset: 0 };
    
    // Only include search if it has a value
    if (trimmedValue) {
      newFilters.search = trimmedValue;
    } else {
      // Remove search field if empty
      delete newFilters.search;
    }
    
    onFiltersChange(newFilters);
  };

  const handleStatusFilter = (status: 'active' | 'inactive' | undefined) => {
    onFiltersChange({ ...filters, status, offset: 0 });
  };

  const handleSort = (sortBy: string) => {
    const currentSort = filters.sortBy;
    const currentOrder = filters.sortOrder;
    
    let newOrder: 'asc' | 'desc' = 'asc';
    if (currentSort === sortBy && currentOrder === 'asc') {
      newOrder = 'desc';
    }
    
    onFiltersChange({ 
      ...filters, 
      sortBy: sortBy as any, 
      sortOrder: newOrder,
      offset: 0 
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    );
  };

  const getLastLoginText = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) return 'Today';
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(lastLogin);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_staff)}</p>
              </div>
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(summary.active_staff)}</p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(summary.new_this_month)}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-orange-600">{formatNumber(summary.staff_with_recent_activity || 0)}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search staff by name or email..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="w-4 h-4" />}
            >
              Filters
            </Button>
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleStatusFilter(e.target.value as any || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Sort By</label>
                <select
                  value={filters.sortBy || 'created_at'}
                  onChange={(e) => handleSort(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">Member Since</option>
                  <option value="username">Username</option>
                  <option value="email">Email</option>
                  <option value="last_login">Last Login</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Order</label>
                <select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => onFiltersChange({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Staff List */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Staff Members</h3>
            {pagination && (
              <p className="text-sm text-gray-600">
                Showing {formatNumber(staff.length)} of {formatNumber(pagination.total_items)} staff members
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{member.username}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {formatDate(member.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Last login: {getLastLoginText(member.last_login)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(member.status)}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewStaff(member)}
                        icon={<Eye className="w-4 h-4" />}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Page {pagination.current_page} of {pagination.total_pages}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, offset: (pagination.current_page - 2) * (filters.limit || 10) })}
                  disabled={!pagination.has_prev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, offset: pagination.current_page * (filters.limit || 10) })}
                  disabled={!pagination.has_next}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StaffList;
