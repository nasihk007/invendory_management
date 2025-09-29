const csv = require('csv-writer');
const fs = require('fs');
const path = require('path');
const { Product, Audit, Notification } = require('../models');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * CSV Export Service
 * Handles bulk data export to CSV files
 */
class CSVExportService {

  /**
   * Export products to CSV file
   * @param {Object} filters - Export filters
   * @param {Object} options - Export options
   * @returns {Object} Export results with file path
   */
  static async exportProducts(filters = {}, options = {}) {
    const {
      includeAuditData = false,
      includeStock = true,
      format = 'standard'
    } = options;

    try {
      // Get products based on filters
      const products = await Product.findAll({
        ...filters,
        limit: 10000, // Maximum export limit
        offset: 0
      });

      if (products.length === 0) {
        throw new ValidationError('No products found matching the specified criteria');
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `products_export_${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Define CSV headers based on format
      const headers = this.getProductExportHeaders(format, includeAuditData);

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Prepare data for export
      const exportData = await this.prepareProductExportData(
        products,
        includeAuditData,
        includeStock,
        format
      );

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      return {
        success: true,
        filename,
        file_path: filePath,
        records_exported: exportData.length,
        export_summary: {
          total_products: exportData.length,
          categories: [...new Set(exportData.map(p => p.category))],
          total_value: exportData.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2),
          low_stock_items: exportData.filter(p => p.quantity <= p.reorder_level).length
        },
        metadata: {
          exported_at: new Date().toISOString(),
          format,
          filters_applied: filters,
          includes_audit_data: includeAuditData
        }
      };

    } catch (error) {
      throw new ValidationError(`Export failed: ${error.message}`);
    }
  }

  /**
   * Export audit records to CSV
   * @param {Object} filters - Export filters
   * @param {Object} options - Export options
   * @returns {Object} Export results
   */
  static async exportAuditRecords(filters = {}, options = {}) {
    const { format = 'detailed' } = options;

    try {
      // Get audit records based on filters
      const result = await Audit.findAll({
        ...filters,
        limit: 10000, // Maximum export limit
        offset: 0
      });

      if (result.audits.length === 0) {
        throw new ValidationError('No audit records found matching the specified criteria');
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `audit_export_${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Define CSV headers
      const headers = this.getAuditExportHeaders(format);

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Prepare data for export
      const exportData = await this.prepareAuditExportData(result.audits, format);

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      return {
        success: true,
        filename,
        file_path: filePath,
        records_exported: exportData.length,
        export_summary: {
          total_records: exportData.length,
          date_range: {
            earliest: result.audits[result.audits.length - 1]?.created_at,
            latest: result.audits[0]?.created_at
          },
          operation_types: [...new Set(exportData.map(a => a.operation_type))],
          unique_products: [...new Set(exportData.map(a => a.product_id))].length,
          unique_users: [...new Set(exportData.map(a => a.user_id))].length
        },
        metadata: {
          exported_at: new Date().toISOString(),
          format,
          filters_applied: filters
        }
      };

    } catch (error) {
      throw new ValidationError(`Audit export failed: ${error.message}`);
    }
  }

  /**
   * Export low stock report to CSV
   * @param {Object} options - Export options
   * @returns {Object} Export results
   */
  static async exportLowStockReport(options = {}) {
    const { includeOutOfStock = true } = options;

    try {
      // Get low stock products
      const lowStockProducts = await Product.getLowStockProducts();

      let exportProducts = lowStockProducts;
      if (!includeOutOfStock) {
        exportProducts = lowStockProducts.filter(p => p.quantity > 0);
      }

      if (exportProducts.length === 0) {
        throw new ValidationError('No low stock products found');
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `low_stock_report_${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Define CSV headers for low stock report
      const headers = [
        { id: 'sku', title: 'SKU' },
        { id: 'name', title: 'Product Name' },
        { id: 'category', title: 'Category' },
        { id: 'current_quantity', title: 'Current Quantity' },
        { id: 'reorder_level', title: 'Reorder Level' },
        { id: 'shortage', title: 'Shortage Amount' },
        { id: 'status', title: 'Status' },
        { id: 'suggested_order', title: 'Suggested Order Quantity' },
        { id: 'location', title: 'Location' },
        { id: 'supplier', title: 'Supplier' },
        { id: 'last_updated', title: 'Last Updated' }
      ];

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Prepare data for export
      const exportData = exportProducts.map(product => ({
        sku: product.sku,
        name: product.name,
        category: product.category,
        current_quantity: product.quantity,
        reorder_level: product.reorder_level,
        shortage: Math.max(0, product.reorder_level - product.quantity),
        status: product.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        suggested_order: Math.max(product.reorder_level * 2 - product.quantity, 0),
        location: product.location || '',
        supplier: product.supplier || '',
        last_updated: product.updated_at
      }));

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      return {
        success: true,
        filename,
        file_path: filePath,
        records_exported: exportData.length,
        export_summary: {
          low_stock_items: exportData.filter(p => p.status === 'LOW_STOCK').length,
          out_of_stock_items: exportData.filter(p => p.status === 'OUT_OF_STOCK').length,
          total_shortage: exportData.reduce((sum, p) => sum + p.shortage, 0),
          categories_affected: [...new Set(exportData.map(p => p.category))],
          estimated_reorder_cost: exportData.reduce((sum, p) => sum + (p.suggested_order * 50), 0) // Rough estimate
        },
        metadata: {
          exported_at: new Date().toISOString(),
          includes_out_of_stock: includeOutOfStock
        }
      };

    } catch (error) {
      throw new ValidationError(`Low stock report export failed: ${error.message}`);
    }
  }

  /**
   * Get product export headers based on format
   * @private
   */
  static getProductExportHeaders(format, includeAuditData) {
    const standardHeaders = [
      { id: 'sku', title: 'SKU' },
      { id: 'name', title: 'Product Name' },
      { id: 'description', title: 'Description' },
      { id: 'category', title: 'Category' },
      { id: 'price', title: 'Price' },
      { id: 'quantity', title: 'Quantity' },
      { id: 'reorder_level', title: 'Reorder Level' },
      { id: 'location', title: 'Location' },
      { id: 'supplier', title: 'Supplier' },
      { id: 'created_at', title: 'Created Date' },
      { id: 'updated_at', title: 'Last Updated' }
    ];

    if (format === 'minimal') {
      return [
        { id: 'sku', title: 'SKU' },
        { id: 'name', title: 'Product Name' },
        { id: 'category', title: 'Category' },
        { id: 'price', title: 'Price' },
        { id: 'quantity', title: 'Quantity' }
      ];
    }

    if (includeAuditData) {
      standardHeaders.push(
        { id: 'last_change_date', title: 'Last Stock Change' },
        { id: 'last_change_user', title: 'Last Changed By' },
        { id: 'total_changes', title: 'Total Changes' }
      );
    }

    return standardHeaders;
  }

  /**
   * Get audit export headers
   * @private
   */
  static getAuditExportHeaders(format) {
    const headers = [
      { id: 'id', title: 'Audit ID' },
      { id: 'product_sku', title: 'Product SKU' },
      { id: 'product_name', title: 'Product Name' },
      { id: 'user_username', title: 'User' },
      { id: 'operation_type', title: 'Operation Type' },
      { id: 'old_quantity', title: 'Old Quantity' },
      { id: 'new_quantity', title: 'New Quantity' },
      { id: 'quantity_change', title: 'Quantity Change' },
      { id: 'reason', title: 'Reason' },
      { id: 'created_at', title: 'Date/Time' }
    ];

    if (format === 'detailed') {
      headers.push({ id: 'user_role', title: 'User Role' });
    }

    return headers;
  }

  /**
   * Prepare product data for export
   * @private
   */
  static async prepareProductExportData(products, includeAuditData, includeStock, format) {
    const exportData = [];

    for (const product of products) {
      const productData = {
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        reorder_level: product.reorder_level,
        location: product.location || '',
        supplier: product.supplier || '',
        created_at: product.created_at,
        updated_at: product.updated_at
      };

      if (format === 'minimal') {
        exportData.push({
          sku: productData.sku,
          name: productData.name,
          category: productData.category,
          price: productData.price,
          quantity: productData.quantity
        });
        continue;
      }

      if (includeAuditData) {
        // Get latest audit record for this product
        const latestAudit = await Audit.findByProduct(product.id, 1);
        if (latestAudit.length > 0) {
          productData.last_change_date = latestAudit[0].created_at;
          productData.last_change_user = latestAudit[0].user_username;
        }

        // Get total changes count
        const allAudits = await Audit.findByProduct(product.id, 1000);
        productData.total_changes = allAudits.length;
      }

      exportData.push(productData);
    }

    return exportData;
  }

  /**
   * Prepare audit data for export
   * @private
   */
  static async prepareAuditExportData(audits, format) {
    return audits.map(audit => {
      const auditData = {
        id: audit.id,
        product_sku: audit.product_sku || 'N/A',
        product_name: audit.product_name || 'N/A',
        user_username: audit.user_username || 'N/A',
        operation_type: audit.operation_type,
        old_quantity: audit.old_quantity,
        new_quantity: audit.new_quantity,
        quantity_change: audit.quantity_change,
        reason: audit.reason || '',
        created_at: audit.created_at
      };

      if (format === 'detailed') {
        auditData.user_role = audit.user_role || 'N/A';
      }

      return auditData;
    });
  }

  /**
   * Generate inventory summary report
   * @param {Object} options - Report options
   * @returns {Object} Export results
   */
  static async exportInventorySummary(options = {}) {
    try {
      // Get all products for summary
      const products = await Product.findAll({ limit: 10000, offset: 0 });

      if (products.length === 0) {
        throw new ValidationError('No products found for summary report');
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `inventory_summary_${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Group products by category
      const categoryData = products.reduce((acc, product) => {
        if (!acc[product.category]) {
          acc[product.category] = {
            category: product.category,
            total_products: 0,
            total_quantity: 0,
            total_value: 0,
            low_stock_items: 0,
            out_of_stock_items: 0,
            average_price: 0
          };
        }

        const cat = acc[product.category];
        cat.total_products += 1;
        cat.total_quantity += product.quantity;
        cat.total_value += product.price * product.quantity;

        if (product.quantity <= product.reorder_level) {
          cat.low_stock_items += 1;
        }
        if (product.quantity === 0) {
          cat.out_of_stock_items += 1;
        }

        return acc;
      }, {});

      // Calculate averages
      Object.values(categoryData).forEach(cat => {
        cat.average_price = parseFloat((cat.total_value / cat.total_quantity || 0).toFixed(2));
        cat.total_value = parseFloat(cat.total_value.toFixed(2));
      });

      // Define CSV headers
      const headers = [
        { id: 'category', title: 'Category' },
        { id: 'total_products', title: 'Total Products' },
        { id: 'total_quantity', title: 'Total Quantity' },
        { id: 'total_value', title: 'Total Value' },
        { id: 'average_price', title: 'Average Unit Price' },
        { id: 'low_stock_items', title: 'Low Stock Items' },
        { id: 'out_of_stock_items', title: 'Out of Stock Items' },
        { id: 'stock_health', title: 'Stock Health %' }
      ];

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Add stock health percentage
      const exportData = Object.values(categoryData).map(cat => ({
        ...cat,
        stock_health: parseFloat((((cat.total_products - cat.low_stock_items) / cat.total_products) * 100).toFixed(1))
      }));

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      return {
        success: true,
        filename,
        file_path: filePath,
        records_exported: exportData.length,
        export_summary: {
          total_categories: exportData.length,
          overall_total_products: products.length,
          overall_total_value: exportData.reduce((sum, cat) => sum + cat.total_value, 0).toFixed(2),
          overall_low_stock: exportData.reduce((sum, cat) => sum + cat.low_stock_items, 0),
          overall_out_of_stock: exportData.reduce((sum, cat) => sum + cat.out_of_stock_items, 0)
        },
        metadata: {
          exported_at: new Date().toISOString(),
          report_type: 'inventory_summary'
        }
      };

    } catch (error) {
      throw new ValidationError(`Inventory summary export failed: ${error.message}`);
    }
  }

  /**
   * Generate CSV import template
   * @returns {Object} Template file information
   */
  static async downloadTemplate() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `product_import_template_${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', 'temp', filename);

      // Ensure temp directory exists
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Define template headers
      const headers = [
        { id: 'sku', title: 'SKU' },
        { id: 'name', title: 'Name' },
        { id: 'description', title: 'Description' },
        { id: 'category', title: 'Category' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'reorder_level', title: 'Reorder Level' },
        { id: 'price', title: 'Price' },
        { id: 'location', title: 'Location' }
      ];

      // Sample data for template
      const sampleData = [
        {
          sku: 'SAMPLE-001',
          name: 'Sample Product 1',
          description: 'This is a sample product for import template',
          category: 'Electronics',
          quantity: 100,
          reorder_level: 10,
          price: 29.99,
          location: 'A1-B2-C3'
        },
        {
          sku: 'SAMPLE-002',
          name: 'Sample Product 2',
          description: 'Another sample product for reference',
          category: 'Clothing',
          quantity: 50,
          reorder_level: 5,
          price: 19.99,
          location: 'B3-C4-D5'
        }
      ];

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Write template data
      await csvWriter.writeRecords(sampleData);

      return {
        filename,
        filepath: filePath,
        headers: headers.map(h => h.title),
        sample_rows: sampleData.length
      };

    } catch (error) {
      throw new ValidationError(`Template generation failed: ${error.message}`);
    }
  }
}

module.exports = CSVExportService;