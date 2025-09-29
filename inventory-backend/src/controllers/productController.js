const { Product, InventoryAudit, sequelize } = require('../models');
const { Op, col } = require('sequelize');
const { NotFoundError, ConflictError, ValidationError } = require('../middleware/errorHandler');
const productService = require('../services/productService');
const DataResponseDto = require('../shared/dto/DataResponseDto');
const PageOptionsDto = require('../shared/dto/PageOptionsDto');
const { ResponseMessages, HttpStatus } = require('../constants/constants');

/**
 * Get All Products with Filtering and Pagination
 * GET /api/products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const pageOptions = PageOptionsDto.fromQuery(req.query);
    const {
      search,
      category,
      lowStock,
      sortBy = 'created_at'
    } = req.query;

    // Build where clause for filtering
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (lowStock === 'true') {
      whereClause[Op.and] = [
        { quantity: { [Op.lte]: col('reorder_level') } }
      ];
    }

    // Build order clause
    const order = [[sortBy, pageOptions.order]];

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      limit: pageOptions.limit,
      offset: pageOptions.offset,
      order
    });

    // Add low stock indicators
    const productsWithStatus = products.map(product => {
      const productData = product.toJSON();
      return {
        ...productData,
        status: {
          is_low_stock: productData.quantity <= productData.reorder_level,
          is_out_of_stock: productData.quantity === 0,
          stock_level: productData.quantity <= productData.reorder_level ? 'low' : 'normal',
          total_value: (parseFloat(productData.price) * productData.quantity).toFixed(2)
        }
      };
    });

    res.status(200).json(new DataResponseDto(
      productsWithStatus,
      true,
      ResponseMessages.PRODUCTS_RETRIEVED,
      pageOptions,
      count
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Product by ID
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(parseInt(id));
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Get audit history for this product
    const auditResult = await InventoryAudit.findWithFilters({
      productId: parseInt(id),
      limit: 10
    });
    const auditHistory = auditResult.audits;

    // Prepare response with additional information
    const productResponse = {
      ...product,
      status: {
        is_low_stock: product.isLowStock(),
        is_out_of_stock: product.isOutOfStock(),
        stock_level: product.quantity <= product.reorder_level ? 'low' : 'normal',
        total_value: product.getTotalValue()
      },
      audit_history: auditHistory.map(audit => audit.toDisplayFormat())
    };

    res.status(200).json(new DataResponseDto(
      { product: productResponse },
      true,
      'Product retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Create New Product
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };

    // Ensure numeric fields are properly converted
    if (productData.quantity !== undefined) {
      productData.quantity = parseInt(productData.quantity);
    }
    if (productData.reorder_level !== undefined) {
      productData.reorder_level = parseInt(productData.reorder_level);
    }
    if (productData.price !== undefined) {
      productData.price = parseFloat(productData.price);
    }


    // Check if SKU already exists
    const existingProduct = await Product.findBySku(productData.sku);
    if (existingProduct) {
      throw new ConflictError(`Product with SKU '${productData.sku}' already exists`);
    }

    // Create product and audit record in a transaction
    const newProduct = await sequelize.transaction(async (transaction) => {
      // Create product
      const product = await Product.create(productData, { transaction });

      // Create initial audit record
      if (product.quantity > 0) {
        await InventoryAudit.create({
          product_id: product.id,
          user_id: req.user.id,
          old_quantity: 0,
          new_quantity: product.quantity,
          reason: 'Initial product creation',
          operation_type: 'purchase'
        }, { transaction });
      }

      return product;
    });

    const productResponse = {
      ...newProduct,
      status: {
        is_low_stock: newProduct.isLowStock(),
        is_out_of_stock: newProduct.isOutOfStock(),
        stock_level: newProduct.quantity <= newProduct.reorder_level ? 'low' : 'normal',
        total_value: newProduct.getTotalValue()
      }
    };

    res.status(201).json(new DataResponseDto(
      { product: productResponse },
      true,
      ResponseMessages.PRODUCT_CREATED
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Update Product
 * PUT /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await Product.findById(parseInt(id));
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Check if SKU is being changed and if it conflicts
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuConflict = await Product.findBySku(updateData.sku);
      if (skuConflict && skuConflict.id !== parseInt(id)) {
        throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
      }
    }

    // Handle quantity changes with audit logging
    if (updateData.quantity !== undefined && updateData.quantity !== existingProduct.quantity) {
      const updatedProduct = await Product.updateStock(
        parseInt(id),
        updateData.quantity,
        req.user.id,
        updateData.reason || 'Product quantity updated',
        'manual_adjustment'
      );

      // Remove quantity from updateData to avoid duplicate update
      const { quantity, reason, ...otherUpdates } = updateData;

      // Update other fields if provided
      if (Object.keys(otherUpdates).length > 0) {
        await Product.update(parseInt(id), otherUpdates);
      }

      const finalProduct = await Product.findById(parseInt(id));
      const productResponse = {
        ...finalProduct,
        status: {
          is_low_stock: finalProduct.isLowStock(),
          is_out_of_stock: finalProduct.isOutOfStock(),
          stock_level: finalProduct.quantity <= finalProduct.reorder_level ? 'low' : 'normal',
          total_value: finalProduct.getTotalValue()
        }
      };

      res.status(200).json(new DataResponseDto(
        { product: productResponse },
        true,
        'Product updated successfully with stock change logged'
      ));

    } else {
      // Regular update without quantity change
      const updatedProduct = await Product.update(parseInt(id), updateData);

      const productResponse = {
        ...updatedProduct,
        status: {
          is_low_stock: updatedProduct.isLowStock(),
          is_out_of_stock: updatedProduct.isOutOfStock(),
          stock_level: updatedProduct.quantity <= updatedProduct.reorder_level ? 'low' : 'normal',
          total_value: updatedProduct.getTotalValue()
        }
      };

      res.status(200).json(new DataResponseDto(
        { product: productResponse },
        true,
        ResponseMessages.PRODUCT_UPDATED
      ));
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Product
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await Product.findById(parseInt(id));
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Only managers can delete products, or if current user is staff and product has no stock
    if (req.user.role !== 'manager' && existingProduct.quantity > 0) {
      throw new ValidationError('Staff can only delete products with zero stock. Contact a manager for products with stock.');
    }

    // Create final audit record before deletion
    await InventoryAudit.create({
      product_id: parseInt(id),
      user_id: req.user.id,
      old_quantity: existingProduct.quantity,
      new_quantity: 0,
      reason: `Product deleted by ${req.user.role} ${req.user.username}`,
      operation_type: 'correction'
    });

    // Delete product
    const success = await Product.delete(parseInt(id));
    if (!success) {
      throw new Error('Failed to delete product');
    }

    res.status(200).json(new DataResponseDto(
      null,
      true,
      ResponseMessages.PRODUCT_DELETED
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Update Product Stock
 * POST /api/products/:id/stock
 */
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, reason, operation_type = 'manual_adjustment' } = req.body;

    // Check if product exists
    const existingProduct = await Product.findById(parseInt(id));
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Update stock with audit logging
    const updatedProduct = await Product.updateStock(
      parseInt(id),
      quantity,
      req.user.id,
      reason,
      operation_type
    );

    const productResponse = {
      ...updatedProduct,
      status: {
        is_low_stock: updatedProduct.isLowStock(),
        is_out_of_stock: updatedProduct.isOutOfStock(),
        stock_level: updatedProduct.quantity <= updatedProduct.reorder_level ? 'low' : 'normal',
        total_value: updatedProduct.getTotalValue()
      },
      stock_change: {
        old_quantity: existingProduct.quantity,
        new_quantity: quantity,
        change: quantity - existingProduct.quantity,
        reason,
        operation_type
      }
    };

    res.status(200).json(new DataResponseDto(
      { product: productResponse },
      true,
      ResponseMessages.STOCK_UPDATED
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Products by Category
 * GET /api/products/category/:category
 */
const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const pageOptions = PageOptionsDto.fromQuery(req.query);

    const result = await Product.findAllWithFilters({
      category,
      limit: pageOptions.limit,
      offset: pageOptions.offset
    });

    const productsWithStatus = result.products.map(product => ({
      ...product,
      status: {
        is_low_stock: product.isLowStock(),
        is_out_of_stock: product.isOutOfStock(),
        stock_level: product.quantity <= product.reorder_level ? 'low' : 'normal',
        total_value: product.getTotalValue()
      }
    }));

    res.status(200).json(new DataResponseDto(
      { products: productsWithStatus, category },
      true,
      `Products in category '${category}' retrieved successfully`,
      pageOptions,
      result.total
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Categories
 * GET /api/products/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.getCategories();

    res.status(200).json(new DataResponseDto(
      { categories, total: categories.length },
      true,
      'Categories retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Low Stock Products
 * GET /api/products/low-stock
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.findLowStock(parseInt(limit));

    const productsWithStatus = products.map(product => ({
      ...product,
      status: {
        is_low_stock: product.isLowStock(),
        is_out_of_stock: product.isOutOfStock(),
        stock_level: product.quantity <= product.reorder_level ? 'low' : 'normal',
        total_value: product.getTotalValue(),
        urgency: product.quantity === 0 ? 'critical' : 'warning'
      }
    }));

    res.status(200).json(new DataResponseDto(
      {
        products: productsWithStatus,
        total: products.length,
        summary: {
          out_of_stock: productsWithStatus.filter(p => p.quantity === 0).length,
          low_stock: productsWithStatus.filter(p => p.quantity > 0 && p.isLowStock()).length
        }
      },
      true,
      'Low stock products retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Search Products
 * GET /api/products/search
 */
const searchProducts = async (req, res, next) => {
  try {
    const {
      q: search,
      category,
      minPrice,
      maxPrice,
      inStock
    } = req.query;
    const pageOptions = PageOptionsDto.fromQuery(req.query);

    if (!search && !category) {
      throw new ValidationError('Search query or category is required');
    }

    const result = await Product.findAllWithFilters({
      search,
      category,
      limit: pageOptions.limit,
      offset: pageOptions.offset
    });

    // Additional filtering for price range and stock
    let filteredProducts = result.products;

    if (minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
    }

    if (inStock === 'true') {
      filteredProducts = filteredProducts.filter(p => p.quantity > 0);
    }

    const productsWithStatus = filteredProducts.map(product => ({
      ...product,
      status: {
        is_low_stock: product.isLowStock(),
        is_out_of_stock: product.isOutOfStock(),
        stock_level: product.quantity <= product.reorder_level ? 'low' : 'normal',
        total_value: product.getTotalValue()
      }
    }));

    res.status(200).json(new DataResponseDto(
      {
        products: productsWithStatus,
        search_terms: {
          query: search,
          category,
          price_range: {
            min: minPrice ? parseFloat(minPrice) : null,
            max: maxPrice ? parseFloat(maxPrice) : null
          },
          in_stock_only: inStock === 'true'
        },
        results: {
          total_found: filteredProducts.length,
          total_in_database: result.total
        }
      },
      true,
      'Search completed successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Product Statistics
 * GET /api/products/stats
 */
const getProductStats = async (req, res, next) => {
  try {
    const allProducts = await Product.findAllWithFilters({ limit: 10000 });
    const lowStockProducts = await Product.findLowStock(1000);
    const categories = await Product.getCategories();

    const stats = {
      total_products: allProducts.total,
      total_categories: categories.length,
      stock_summary: {
        total_items: allProducts.products.reduce((sum, p) => sum + p.quantity, 0),
        total_value: allProducts.products.reduce((sum, p) => sum + p.getTotalValue(), 0).toFixed(2),
        low_stock_products: lowStockProducts.length,
        out_of_stock_products: allProducts.products.filter(p => p.quantity === 0).length
      },
      category_breakdown: {}
    };

    // Calculate category statistics
    for (const category of categories) {
      const categoryProducts = allProducts.products.filter(p => p.category === category);
      stats.category_breakdown[category] = {
        product_count: categoryProducts.length,
        total_quantity: categoryProducts.reduce((sum, p) => sum + p.quantity, 0),
        total_value: categoryProducts.reduce((sum, p) => sum + p.getTotalValue(), 0).toFixed(2)
      };
    }

    res.status(200).json(new DataResponseDto(
      stats,
      true,
      'Product statistics retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductsByCategory,
  getCategories,
  getLowStockProducts,
  searchProducts,
  getProductStats
};