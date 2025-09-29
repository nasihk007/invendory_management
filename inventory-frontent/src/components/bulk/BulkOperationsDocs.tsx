import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Download, 
  Upload, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bulkAPI } from '@/api/api';
import { QUERY_KEYS } from '@/utils/constants';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const BulkOperationsDocs: React.FC = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: docs, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.BULK_DOCS,
    queryFn: () => bulkAPI.getBulkDocs(),
    refetchOnWindowFocus: false,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const copyCodeBlock = (text: string) => {
    copyToClipboard(text, 'Code');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading bulk operations documentation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Documentation</h3>
        <p className="text-gray-600">Unable to load bulk operations documentation</p>
      </div>
    );
  }

  const docsData = docs?.data?.data;

  if (!docsData) {
    return (
      <div className="text-center py-8">
        <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documentation Available</h3>
        <p className="text-gray-600">Documentation is not available at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Operations Documentation</h1>
            <p className="text-gray-600">Version {docsData.version}</p>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">{docsData.message}</p>
      </div>

      {/* Quick Start */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start Guide</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">1</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Upload CSV File</h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload a CSV file with your product data using the upload endpoint
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">2</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Validate Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                Review validation results and fix any errors before importing
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">3</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Import Products</h3>
              <p className="text-sm text-gray-600 mt-1">
                Import validated data into your inventory system
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* API Endpoints */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
        <div className="space-y-4">
          <ExpandableSection title="Import Operations" defaultExpanded>
            <div className="space-y-3">
              {docsData.endpoints.import.map((endpoint, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono text-gray-800">{endpoint}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint, 'Endpoint')}
                      icon={copiedText === 'Endpoint' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    >
                      {copiedText === 'Endpoint' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Export Operations">
            <div className="space-y-3">
              {docsData.endpoints.export.map((endpoint, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono text-gray-800">{endpoint}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint, 'Endpoint')}
                      icon={copiedText === 'Endpoint' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    >
                      {copiedText === 'Endpoint' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Management Operations">
            <div className="space-y-3">
              {docsData.endpoints.management.map((endpoint, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono text-gray-800">{endpoint}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint, 'Endpoint')}
                      icon={copiedText === 'Endpoint' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    >
                      {copiedText === 'Endpoint' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </div>
      </Card>

      {/* Import Template */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Template</h2>
        <div className="space-y-4">
          <ExpandableSection title="Required Fields" defaultExpanded>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docsData.import_template.required_fields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">{field}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Optional Fields">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docsData.import_template.optional_fields.map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">{field}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Data Validation Rules">
            <div className="space-y-3">
              {Object.entries(docsData.import_template.data_validation).map(([field, rule]) => (
                <div key={field} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{field}</span>
                  </div>
                  <p className="text-sm text-gray-600">{rule}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </div>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Features</h3>
          <div className="space-y-3">
            {Object.entries(docsData.import_features).map(([feature, description]) => (
              <div key={feature} className="flex items-start space-x-3">
                <Upload className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">
                    {feature.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Features</h3>
          <div className="space-y-3">
            {Object.entries(docsData.export_features).map(([feature, description]) => (
              <div key={feature} className="flex items-start space-x-3">
                <Download className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">
                    {feature.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* File Management */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">File Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Upload Limits</h3>
            <div className="space-y-2">
              {Object.entries(docsData.file_management.upload_limits).map(([limit, value]) => (
                <div key={limit} className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">
                    {limit.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Retention Policies</h3>
            <div className="space-y-2">
              {Object.entries(docsData.file_management.retention).map(([type, duration]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">
                    {type.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-medium">{duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Best Practices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Best Practices</h3>
          <div className="space-y-3">
            {docsData.best_practices.import.map((practice, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-700">{practice}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Best Practices</h3>
          <div className="space-y-3">
            {docsData.best_practices.export.map((practice, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-gray-700">{practice}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Error Handling */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Handling</h2>
        <div className="space-y-4">
          {Object.entries(docsData.error_handling).map(([errorType, description]) => (
            <div key={errorType} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="font-medium text-gray-900 capitalize">
                  {errorType.replace(/_/g, ' ')}
                </h3>
              </div>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Permissions */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(docsData.permissions).map(([operation, role]) => (
            <div key={operation} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900 capitalize">
                  {operation.replace(/_/g, ' ')}
                </h3>
              </div>
              <p className="text-sm text-gray-600">Required role: <span className="font-medium">{role}</span></p>
            </div>
          ))}
        </div>
      </Card>

      {/* Example Code */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Example Usage</h2>
        <div className="space-y-4">
          <ExpandableSection title="Upload CSV File" defaultExpanded>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyCodeBlock(`curl -X POST http://localhost:3001/api/bulk/upload \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@products.csv" \\
  -H "Authorization: Bearer YOUR_TOKEN"`)}
                icon={<Copy className="w-3 h-3" />}
              >
                Copy
              </Button>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{`curl -X POST http://localhost:3001/api/bulk/upload \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@products.csv" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</code>
              </pre>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Import Products">
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyCodeBlock(`curl -X POST http://localhost:3001/api/bulk/import \\
  -H "Content-Type: application/json" \\
  -d '{"filePath": "uploads/products.csv", "updateExisting": true}' \\
  -H "Authorization: Bearer YOUR_TOKEN"`)}
                icon={<Copy className="w-3 h-3" />}
              >
                Copy
              </Button>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{`curl -X POST http://localhost:3001/api/bulk/import \\
  -H "Content-Type: application/json" \\
  -d '{"filePath": "uploads/products.csv", "updateExisting": true}' \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</code>
              </pre>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Export Products">
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyCodeBlock(`curl -X POST http://localhost:3001/api/bulk/export/products \\
  -H "Content-Type: application/json" \\
  -d '{"category": "Electronics", "includeAuditData": true}' \\
  -H "Authorization: Bearer YOUR_TOKEN"`)}
                icon={<Copy className="w-3 h-3" />}
              >
                Copy
              </Button>
              <pre className="text-green-400 text-sm overflow-x-auto">
                <code>{`curl -X POST http://localhost:3001/api/bulk/export/products \\
  -H "Content-Type: application/json" \\
  -d '{"category": "Electronics", "includeAuditData": true}' \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</code>
              </pre>
            </div>
          </ExpandableSection>
        </div>
      </Card>
    </div>
  );
};

export default BulkOperationsDocs;
