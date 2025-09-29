import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bulkAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { formatFileSize, formatDate } from '@/utils/formatters';

const BulkOperationsStats: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.BULK_STATS,
    queryFn: () => bulkAPI.getBulkStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleDownloadFile = async (filename: string) => {
    try {
      const response = await bulkAPI.downloadExport(filename);
      
      // Create blob from response data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename} successfully`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.message || 'Failed to download file');
    }
  };

  const handleUseForImport = (filename: string) => {
    // This would typically open the import wizard with the selected file
    // For now, we'll show a message
    toast.info(`Using ${filename} for import - This feature will open the import wizard`);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading bulk operations statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Stats</h3>
        <p className="text-gray-600">Unable to load bulk operations statistics</p>
      </div>
    );
  }

  const statsData = stats?.data?.data;

  if (!statsData) {
    return (
      <div className="text-center py-8">
        <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
        <p className="text-gray-600">No bulk operations have been performed yet</p>
      </div>
    );
  }

  const exportFiles = statsData.export_files.files || [];
  const uploadedFiles = statsData.uploaded_files.files || [];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Export Files</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsData.export_files.count}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Uploaded Files</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsData.uploaded_files.count}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Storage Used</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatFileSize(statsData.export_files.total_size + statsData.uploaded_files.total_size)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Export Retention</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsData.system_limits.export_retention}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* System Limits */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">File Limits</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Max File Size:</span>
                <span className="font-medium">{statsData.system_limits.max_file_size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Records per Import:</span>
                <span className="font-medium">
                  {statsData.system_limits.max_records_per_import.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supported Formats:</span>
                <span className="font-medium">
                  {statsData.system_limits.supported_formats.join(', ')}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Available Operations</h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Import Operations:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {statsData.available_operations.import.map((op, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{op}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Export Operations:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {statsData.available_operations.export.map((op, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{op}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Export Files */}
      {exportFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Export Files</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Cleanup files */}}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Clean Up
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exportFiles.slice(0, 10).map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {file.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(file.filename)}
                        icon={<Download className="w-3 h-3" />}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Uploaded Files</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Cleanup files */}}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Clean Up
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedFiles.slice(0, 10).map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Upload className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {file.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUseForImport(file.filename)}
                        icon={<FileText className="w-3 h-3" />}
                      >
                        Use for Import
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Storage Usage Breakdown */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Export Files</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Files:</span>
                <span className="font-medium">{statsData.export_files.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Size:</span>
                <span className="font-medium">{formatFileSize(statsData.export_files.total_size)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((statsData.export_files.total_size / (100 * 1024 * 1024)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Uploaded Files</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Files:</span>
                <span className="font-medium">{statsData.uploaded_files.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Size:</span>
                <span className="font-medium">{formatFileSize(statsData.uploaded_files.total_size)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((statsData.uploaded_files.total_size / (100 * 1024 * 1024)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BulkOperationsStats;
