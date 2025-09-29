import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { X } from 'lucide-react';
import { Product, StockUpdate } from '@/types/product';
import { stockUpdateSchema } from '@/utils/validators';
import { OPERATION_TYPES } from '@/utils/constants';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StockUpdate) => void;
  product: Product | null;
  loading?: boolean;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading = false,
}) => {
  const [operationType, setOperationType] = useState<string>('manual_adjustment');
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockUpdate>({
    resolver: yupResolver(stockUpdateSchema),
  });

  const watchedQuantity = watch('quantity');

  useEffect(() => {
    if (product) {
      setValue('quantity', product.quantity);
      setValue('operation_type', 'manual_adjustment' as any);
      setValue('reason', '');
    }
  }, [product, setValue]);

  const handleFormSubmit = (data: StockUpdate) => {
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

  const operationOptions = [
    { value: OPERATION_TYPES.MANUAL_ADJUSTMENT, label: 'Manual Adjustment' },
    { value: OPERATION_TYPES.SALE, label: 'Sale' },
    { value: OPERATION_TYPES.PURCHASE, label: 'Purchase' },
    { value: OPERATION_TYPES.DAMAGE, label: 'Damage/Loss' },
    { value: OPERATION_TYPES.TRANSFER, label: 'Transfer' },
    { value: OPERATION_TYPES.CORRECTION, label: 'Correction' },
  ];

  if (!product) return null;

  const quantityDifference = watchedQuantity - product.quantity;

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
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Update Stock - {product.name}
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Current Stock:</span>
              <span className="ml-2 font-medium">{product.quantity}</span>
            </div>
            <div>
              <span className="text-gray-600">SKU:</span>
              <span className="ml-2 font-medium">{product.sku}</span>
            </div>
          </div>
        </div>

        <Input
          label="New Quantity"
          type="number"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
          disabled={loading}
        />

        {quantityDifference !== 0 && (
          <div className={`p-3 rounded-lg ${
            quantityDifference > 0 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              quantityDifference > 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              {quantityDifference > 0 ? 'Increase' : 'Decrease'} of {Math.abs(quantityDifference)} units
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operation Type
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
            {...register('operation_type')}
            onChange={(e) => setOperationType(e.target.value)}
            disabled={loading}
          >
            {operationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.operation_type && (
            <p className="text-sm text-red-600 mt-1">{errors.operation_type.message}</p>
          )}
        </div>

        <Input
          label="Reason"
          placeholder="Enter reason for stock update..."
          error={errors.reason?.message}
          {...register('reason')}
          disabled={loading}
        />

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
                  Update Stock
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickEditModal;