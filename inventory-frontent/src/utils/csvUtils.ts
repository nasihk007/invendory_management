import Papa from 'papaparse';
import { validateCsvFile, validateCsvHeaders, validateCsvRow } from './validators';
import { CsvProductRow } from '@/types/product';
import { STORAGE_KEYS } from './constants';

export interface CsvParseResult {
  data: CsvProductRow[];
  validRows: CsvProductRow[];
  invalidRows: CsvProductRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  headers: string[];
  headerValidation: {
    isValid: boolean;
    missingHeaders: string[];
  };
}

export const parseCsvFile = (file: File): Promise<CsvParseResult> => {
  return new Promise((resolve, reject) => {
    // First validate the file
    const fileValidation = validateCsvFile(file);
    if (!fileValidation.isValid) {
      reject(new Error(fileValidation.error));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('CSV parsing failed: ' + results.errors.map(e => e.message).join(', ')));
          return;
        }

        const headers = results.meta.fields || [];
        const headerValidation = validateCsvHeaders(headers);

        if (!headerValidation.isValid) {
          reject(new Error(`Missing required headers: ${headerValidation.missingHeaders.join(', ')}`));
          return;
        }

        // Validate each row
        const data = results.data as any[];
        const validatedData: CsvProductRow[] = data.map((row, index) => {
          const validation = validateCsvRow(row, index + 1);
          return {
            sku: row.sku?.toString().trim() || '',
            name: row.name?.toString().trim() || '',
            description: row.description?.toString().trim() || '',
            category: row.category?.toString().trim() || '',
            quantity: parseInt(row.quantity) || 0,
            reorder_level: parseInt(row.reorder_level) || 0,
            price: parseFloat(row.price) || 0,
            location: row.location?.toString().trim() || '',
            rowIndex: index + 1,
            isValid: validation.isValid,
            errors: validation.errors,
          };
        });

        const validRows = validatedData.filter(row => row.isValid);
        const invalidRows = validatedData.filter(row => !row.isValid);

        const result: CsvParseResult = {
          data: validatedData,
          validRows,
          invalidRows,
          totalRows: validatedData.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          headers,
          headerValidation,
        };

        resolve(result);
      },
      error: (error) => {
        reject(new Error('Failed to parse CSV file: ' + error.message));
      },
    });
  });
};

export const downloadCsvFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  window.URL.revokeObjectURL(url);
};

export const exportToCsv = (data: any[], filename: string, headers?: string[]): void => {
  const csvContent = Papa.unparse(data, {
    header: true,
    columns: headers,
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadCsvFile(blob, filename);
};

export const generateCsvTemplate = (): void => {
  const templateData = [
    {
      sku: 'SAMPLE-001',
      name: 'Sample Product',
      description: 'This is a sample product description',
      category: 'Electronics',
      quantity: 100,
      reorder_level: 10,
      price: 29.99,
      location: 'A1-B2-C3',
    },
  ];

  const csvContent = Papa.unparse(templateData, {
    header: true,
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadCsvFile(blob, 'product-import-template.csv');
};

export const formatCsvData = (products: any[]): any[] => {
  return products.map(product => ({
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    category: product.category,
    quantity: product.quantity,
    reorder_level: product.reorder_level,
    price: product.price,
    location: product.location || '',
    created_at: product.created_at,
    updated_at: product.updated_at,
  }));
};

export const getCsvErrorMessage = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `${errors.length} errors: ${errors.join(', ')}`;
};

export const calculateCsvStats = (result: CsvParseResult) => {
  const successRate = result.totalRows > 0 ? (result.validCount / result.totalRows) * 100 : 0;
  
  return {
    successRate: Math.round(successRate * 100) / 100,
    errorRate: Math.round((100 - successRate) * 100) / 100,
    canProceed: result.validCount > 0,
    hasErrors: result.invalidCount > 0,
  };
};

// Storage utilities for CSV session data
export const saveCsvSession = (data: CsvParseResult): void => {
  try {
    localStorage.setItem('csv_import_session', JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to save CSV session data:', error);
  }
};

export const getCsvSession = (): CsvParseResult | null => {
  try {
    const saved = localStorage.getItem('csv_import_session');
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    
    // Check if session is older than 1 hour
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > oneHour) {
      localStorage.removeItem('csv_import_session');
      return null;
    }
    
    return parsed;
  } catch (error) {
    localStorage.removeItem('csv_import_session');
    return null;
  }
};

export const clearCsvSession = (): void => {
  localStorage.removeItem('csv_import_session');
};