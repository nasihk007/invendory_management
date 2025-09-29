import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Activity, 
  Clock,
  TrendingUp,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Staff } from '@/types/staff';
import { formatDate, formatNumber } from '@/utils/formatters';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

interface StaffDetailsProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
}

const StaffDetails: React.FC<StaffDetailsProps> = ({
  staff,
  isOpen,
  onClose,
}) => {

  if (!staff) return null;

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <div className="w-2 h-2 bg-red-400 rounded-full mr-2" />
        Inactive
      </span>
    );
  };

  const getLastLoginText = (lastLogin?: string) => {
    if (!lastLogin) return 'Never logged in';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(lastLogin);
  };

  const getMemberSinceText = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Staff Member Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{staff.username}</h2>
              <p className="text-gray-600">{staff.email}</p>
              <div className="mt-2">
                {getStatusBadge(staff.status)}
              </div>
            </div>
          </div>
          
        </div>


        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-medium">{staff.username}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{staff.email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium capitalize flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    {staff.role}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  {getStatusBadge(staff.status)}
                </div>
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Account Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">{formatDate(staff.created_at)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{getMemberSinceText(staff.created_at)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Login:</span>
                  <span className="font-medium">{getLastLoginText(staff.last_login)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium">{formatDate(staff.updated_at)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Information */}
        {staff.profile && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staff.profile.first_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Name:</span>
                    <span className="font-medium">{staff.profile.first_name}</span>
                  </div>
                )}
                
                {staff.profile.last_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Name:</span>
                    <span className="font-medium">{staff.profile.last_name}</span>
                  </div>
                )}
                
                {staff.profile.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{staff.profile.phone}</span>
                  </div>
                )}
                
                {staff.profile.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{staff.profile.department}</span>
                  </div>
                )}
                
                {staff.profile.position && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Position:</span>
                    <span className="font-medium">{staff.profile.position}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Activity Stats (if available) */}
        {staff.stats && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Activity Statistics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(staff.stats.total_actions)}</p>
                  <p className="text-sm text-gray-600">Total Actions</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(staff.stats.products_managed)}</p>
                  <p className="text-sm text-gray-600">Products Managed</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                    <AlertTriangle className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{staff.stats.productivity_score}%</p>
                  <p className="text-sm text-gray-600">Productivity Score</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Activity:</span>
                  <span className="font-medium">{staff.stats.last_activity}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default StaffDetails;
