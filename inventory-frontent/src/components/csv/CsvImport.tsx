import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useCsv } from '@/hooks/useCsv';
import { CsvProductRow } from '@/types/product';
import { getCsvErrorMessage, calculateCsvStats } from '@/utils/csvUtils';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Table from '@/components/common/Table';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const CsvImport: React.FC = () => {
  const { 
    parsedData, 
    validationErrors, 
    parseFile, 
    importData, 
    downloadTemplate, 
    isImporting 
  } = useCsv();
  
  const [parseResult, setParseResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      try {
        const result = await parseFile(file);
        setParseResult(result);
        setImportResult(null);
      } catch (error) {
        console.error('Parse error:', error);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleImport = async () => {
    if (!parseResult?.validRows?.length) return;
    
    try {
      // Create a new file with only valid rows
      const validCsv = parseResult.validRows.map((row: CsvProductRow) => ({
        sku: row.sku,
        name: row.name,
        description: row.description,
        category: row.category,
        quantity: row.quantity,
        reorder_level: row.reorder_level,
        price: row.price,
        location: row.location,
      }));
      
      const csvContent = [
        Object.keys(validCsv[0]).join(','),
        ...validCsv.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'import.csv', { type: 'text/csv' });
      
      const result = await importData(file);
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const stats = parseResult ? calculateCsvStats(parseResult) : null;

  const validRowsColumns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'reorder_level', header: 'Reorder Level' },
    { key: 'price', header: 'Price' },
    { key: 'location', header: 'Location' },
  ];

  const errorRowsColumns = [
    { key: 'rowIndex', header: 'Row' },
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Name' },
    { 
      key: 'errors', 
      header: 'Errors',
      render: (row: CsvProductRow) => (
        <div className="space-y-1">
          {row.errors?.map((error, index) => (
            <span key={index} className="block text-xs text-red-600">
              {error}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-gray-900">Import Products</h1>
        <p className="text-gray-600">
          Upload a CSV file to import multiple products at once
        </p>
      </motion.div>

      {/* Template Download */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">CSV Template</h3>
              <p className="text-sm text-gray-600">
                Download the template to see the required format
              </p>
            </div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              icon={<Download className="w-4 h-4" />}
            >
              Download Template
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* File Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop a CSV file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Parse Results */}
      {parseResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Statistics */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {parseResult.totalRows}
                </div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {parseResult.validCount}
                </div>
                <div className="text-sm text-gray-600">Valid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {parseResult.invalidCount}
                </div>
                <div className="text-sm text-gray-600">Invalid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            {stats?.canProceed && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="primary"
                  onClick={handleImport}
                  loading={isImporting}
                  icon={<Upload className="w-4 h-4" />}
                >
                  Import {parseResult.validCount} Products
                </Button>
              </div>
            )}
          </Card>

          {/* Valid Rows */}
          {parseResult.validRows.length > 0 && (
            <Card>
              <div className="flex items-center mb-4">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Valid Products ({parseResult.validCount})
                </h3>
              </div>
              <Table
                data={parseResult.validRows.slice(0, 10)}
                columns={validRowsColumns}
                emptyMessage="No valid products found"
              />
              {parseResult.validRows.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 10 of {parseResult.validRows.length} valid products
                </p>
              )}
            </Card>
          )}

          {/* Invalid Rows */}
          {parseResult.invalidRows.length > 0 && (
            <Card>
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Invalid Products ({parseResult.invalidCount})
                </h3>
              </div>
              <Table
                data={parseResult.invalidRows}
                columns={errorRowsColumns}
                emptyMessage="No invalid products found"
              />
            </Card>
          )}
        </motion.div>
      )}

      {/* Import Results */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import Completed Successfully!
              </h3>
              <p className="text-gray-600">
                {importResult.imported} products have been imported successfully.
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default CsvImport;