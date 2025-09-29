import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users } from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaff';
import { Staff, StaffFilters } from '@/types/staff';
import CreateStaffForm from '@/components/staff/CreateStaffForm';
import StaffList from '@/components/staff/StaffList';
import StaffDetails from '@/components/staff/StaffDetails';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

const StaffManagement: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  
  const [filters, setFilters] = useState<StaffFilters>({
    limit: 10,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const {
    staff,
    summary,
    pagination,
    isLoading,
    isCreating,
    createStaff,
  } = useStaffManagement(filters);



  const handleFiltersChange = (newFilters: StaffFilters) => {
    setFilters(newFilters);
  };

  const handleViewStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowStaffDetails(true);
  };



  const handleCreateStaff = () => {
    setShowCreateForm(true);
  };

  const handleCloseCreateForm = () => {
    setShowCreateForm(false);
  };

  const handleCloseStaffDetails = () => {
    setSelectedStaff(null);
    setShowStaffDetails(false);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage staff members and their access to the system</p>
        </div>
        <Button
          onClick={handleCreateStaff}
          icon={<UserPlus className="w-4 h-4" />}
          disabled={isCreating}
        >
          Add Staff Member
        </Button>
      </motion.div>

      {/* Quick Stats */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{summary.total_staff}</p>
                <p className="text-sm text-gray-600">Total Staff</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{summary.active_staff}</p>
                <p className="text-sm text-gray-600">Active Staff</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{summary.inactive_staff || 0}</p>
                <p className="text-sm text-gray-600">Inactive Staff</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{summary.new_this_month}</p>
                <p className="text-sm text-gray-600">New This Month</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Staff List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StaffList
          staff={staff}
          summary={summary}
          pagination={pagination}
          isLoading={isLoading}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onViewStaff={handleViewStaff}
        />
      </motion.div>

      {/* Modals */}
      <CreateStaffForm
        isOpen={showCreateForm}
        onClose={handleCloseCreateForm}
      />

      <StaffDetails
        staff={selectedStaff}
        isOpen={showStaffDetails}
        onClose={handleCloseStaffDetails}
      />

    </div>
  );
};

export default StaffManagement;
