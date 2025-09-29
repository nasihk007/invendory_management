import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, Edit, Trash2, Package } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useProductStore } from '@/store/productStore';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductFormData, StockUpdate } from '@/types/product';
import { PRODUCT_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatDate, formatStockStatus } from '@/utils/formatters';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Card from '@/components/common/Card';
import ProductModal from '@/components/products/ProductModal';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import QuickEditModal from '@/components/products/QuickEditModal';
import DeleteConfirmationModal from '@/components/products/DeleteConfirmationModal';

const Products: React.FC = () => {
  const { user } = useAuth();
  const { 
    products, 
    filters, 
    pagination,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    isCreating,
    isUpdating,
    isDeleting,
    isUpdatingStock,
  } = useProducts();
  
  const { setFilters, setSelectedProduct, selectedProduct } = useProductStore();
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
  const [showLowStock, setShowLowStock] = useState(filters.lowStock || false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchTerm, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, setFilters]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilters({ category, page: 1 });
  };

  const handleLowStockToggle = () => {
    const newLowStock = !showLowStock;
    setShowLowStock(newLowStock);
    setFilters({ lowStock: newLowStock, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ page });
  };

  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters({ sortBy: sortBy as keyof Product, sortOrder });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleQuickEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowQuickEditModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletingProduct) {
      deleteProduct(deletingProduct.id);
      setShowDeleteModal(false);
      setDeletingProduct(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingProduct(null);
  };

  const handleProductSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data });
    } else {
      createProduct(data);
    }
  };

  const handleStockUpdate = (data: StockUpdate) => {
    if (selectedProduct) {
      updateStock({ id: selectedProduct.id, data });
    }
  };

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (product: Product) => (
        <span className="font-mono text-sm">{product.sku}</span>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      render: (product: Product) => (
        <div>
          <p className="font-medium text-gray-900">{product.name}</p>
          <p className="text-sm text-gray-500">{product.category}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock',
      sortable: true,
      render: (product: Product) => {
        const status = formatStockStatus(product.quantity, product.reorder_level);
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{product.quantity}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              status.status === 'out_of_stock' 
                ? 'bg-red-100 text-red-800'
                : status.status === 'low_stock'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {status.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (product: Product) => formatCurrency(parseFloat(product.price)),
    },
    {
      key: 'location',
      header: 'Location',
      render: (product: Product) => product.location || 'N/A',
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (product: Product) => formatDate(product.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewProduct(product)}
            icon={<Eye className="w-4 h-4" />}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickEdit(product)}
            icon={<Package className="w-4 h-4" />}
          >
            Stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditProduct(product)}
            icon={<Edit className="w-4 h-4" />}
          >
            Edit
          </Button>
          {user?.role === 'manager' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteProduct(product)}
              icon={<Trash2 className="w-4 h-4" />}
              loading={isDeleting}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your inventory products</p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddProduct}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Product
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">All Categories</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="lowStock"
                checked={showLowStock}
                onChange={handleLowStockToggle}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="lowStock" className="text-sm text-gray-700">
                Low Stock Only
              </label>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Filter className="w-4 h-4 mr-2" />
              {pagination.total} products found
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Table
          data={products}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSort={handleSort}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          emptyMessage="No products found. Add your first product to get started."
        />
      </motion.div>

      {/* Modals */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleProductSubmit}
        product={editingProduct}
        loading={isCreating || isUpdating}
      />

      <ProductDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        product={selectedProduct}
      />

      <QuickEditModal
        isOpen={showQuickEditModal}
        onClose={() => setShowQuickEditModal(false)}
        onSubmit={handleStockUpdate}
        product={selectedProduct}
        loading={isUpdatingStock}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        product={deletingProduct}
        loading={isDeleting}
      />
    </div>
  );
};

export default Products;