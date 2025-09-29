import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { X } from 'lucide-react';
import { Product, ProductFormData } from '@/types/product';
import { productSchema } from '@/utils/validators';
import { PRODUCT_CATEGORIES } from '@/utils/constants';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null;
  loading?: boolean;
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: yupResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        quantity: product.quantity,
        reorder_level: product.reorder_level,
        price: product.price,
        location: product.location,
      });
    } else {
      reset({
        sku: '',
        name: '',
        description: '',
        category: '',
        quantity: 0,
        reorder_level: 10,
        price: 0,
        location: '',
      });
    }
  }, [product, reset]);

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const prevLoadingRef = useRef(loading);

  // Auto-close modal after successful operation
  useEffect(() => {
    // Only auto-close if we were previously loading and now we're not
    // This prevents the modal from closing immediately when opened
    if (prevLoadingRef.current === true && loading === false && isOpen) {
      // Close modal after a short delay to allow for success feedback
      const timer = setTimeout(() => {
        onClose();
      }, 1500); // 1.5 seconds delay to show success message
      return () => clearTimeout(timer);
    }
    
    // Update the ref with current loading state
    prevLoadingRef.current = loading;
  }, [loading, isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            // Disabled backdrop click to close
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                onMouseDown={(e) => e.preventDefault()}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  error={errors.sku?.message}
                  {...register('sku')}
                  disabled={loading}
                />

                <Input
                  label="Product Name"
                  error={errors.name?.message}
                  {...register('name')}
                  disabled={loading}
                />
              </div>

              <Input
                label="Description"
                error={errors.description?.message}
                {...register('description')}
                disabled={loading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    {...register('category')}
                    disabled={loading}
                  >
                    <option value="">Select a category</option>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                  )}
                </div>

                <Input
                  label="Location"
                  error={errors.location?.message}
                  {...register('location')}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Quantity"
                  type="number"
                  error={errors.quantity?.message}
                  {...register('quantity', { valueAsNumber: true })}
                  disabled={loading}
                />

                <Input
                  label="Reorder Level"
                  type="number"
                  error={errors.reorder_level?.message}
                  {...register('reorder_level', { valueAsNumber: true })}
                  disabled={loading}
                />

                <Input
                  label="Price"
                  type="number"
                  step="0.01"
                  error={errors.price?.message}
                  {...register('price', { valueAsNumber: true })}
                  disabled={loading}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                >
                  {product ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductModal