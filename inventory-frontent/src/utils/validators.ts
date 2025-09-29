import * as yup from 'yup';
import { PRODUCT_CATEGORIES, USER_ROLES } from './constants';

// Authentication validation schemas
export const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  role: yup
    .string()
    .required('Role is required')
    .oneOf(Object.values(USER_ROLES), 'Please select a valid role'),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmNewPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

// Product validation schemas
export const productSchema = yup.object({
  sku: yup
    .string()
    .required('SKU is required')
    .max(50, 'SKU must be less than 50 characters')
    .matches(/^[A-Z0-9-]+$/, 'SKU can only contain uppercase letters, numbers, and hyphens'),
  name: yup
    .string()
    .required('Product name is required')
    .min(2, 'Product name must be at least 2 characters')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  category: yup
    .string()
    .required('Category is required')
    .min(2, 'Category must be at least 2 characters')
    .max(100, 'Category must be less than 100 characters'),
  quantity: yup
    .number()
    .required('Quantity is required')
    .min(0, 'Quantity cannot be negative')
    .integer('Quantity must be a whole number'),
  reorder_level: yup
    .number()
    .required('Reorder level is required')
    .min(0, 'Reorder level cannot be negative')
    .integer('Reorder level must be a whole number'),
  price: yup
    .number()
    .required('Price is required')
    .min(0, 'Price cannot be negative')
    .max(999999.99, 'Price is too high'),
  location: yup
    .string()
    .max(100, 'Location must be less than 100 characters')
    .trim(),
});

export const stockUpdateSchema = yup.object({
  quantity: yup
    .number()
    .required('New quantity is required')
    .min(0, 'Quantity cannot be negative')
    .integer('Quantity must be a whole number'),
  reason: yup
    .string()
    .required('Reason is required')
    .max(255, 'Reason must be less than 255 characters')
    .trim(),
  operation_type: yup
    .string()
    .required('Operation type is required')
    .oneOf(
      ['manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction'],
      'Please select a valid operation type'
    ),
});

// CSV validation functions
export const validateCsvHeaders = (headers: string[]): { isValid: boolean; missingHeaders: string[] } => {
  const requiredHeaders = ['sku', 'name', 'category', 'quantity', 'reorder_level', 'price'];
  const lowercaseHeaders = headers.map(h => h.toLowerCase().trim());
  const missingHeaders = requiredHeaders.filter(header => !lowercaseHeaders.includes(header));
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
  };
};

export const validateCsvRow = (row: any, rowIndex: number): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // SKU validation
  if (!row.sku || typeof row.sku !== 'string') {
    errors.push('SKU is required');
  } else if (row.sku.trim().length === 0) {
    errors.push('SKU cannot be empty');
  } else if (row.sku.length > 50) {
    errors.push('SKU must be less than 50 characters');
  } else if (!/^[A-Z0-9-_]+$/i.test(row.sku)) {
    errors.push('SKU can only contain letters, numbers, hyphens, and underscores');
  }
  
  // Name validation
  if (!row.name || typeof row.name !== 'string') {
    errors.push('Product name is required');
  } else if (row.name.trim().length === 0) {
    errors.push('Product name cannot be empty');
  } else if (row.name.length > 255) {
    errors.push('Product name must be less than 255 characters');
  }
  
  // Category validation
  if (!row.category || typeof row.category !== 'string') {
    errors.push('Category is required');
  } else if (!PRODUCT_CATEGORIES.includes(row.category as any)) {
    errors.push(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`);
  }
  
  // Quantity validation
  const quantity = Number(row.quantity);
  if (isNaN(quantity)) {
    errors.push('Quantity must be a valid number');
  } else if (quantity < 0) {
    errors.push('Quantity cannot be negative');
  } else if (!Number.isInteger(quantity)) {
    errors.push('Quantity must be a whole number');
  }
  
  // Reorder level validation
  const reorderLevel = Number(row.reorder_level);
  if (isNaN(reorderLevel)) {
    errors.push('Reorder level must be a valid number');
  } else if (reorderLevel < 0) {
    errors.push('Reorder level cannot be negative');
  } else if (!Number.isInteger(reorderLevel)) {
    errors.push('Reorder level must be a whole number');
  }
  
  // Price validation
  const price = Number(row.price);
  if (isNaN(price)) {
    errors.push('Price must be a valid number');
  } else if (price <= 0) {
    errors.push('Price must be greater than 0');
  } else if (price > 999999.99) {
    errors.push('Price is too high');
  }
  
  // Description validation (optional)
  if (row.description && typeof row.description === 'string' && row.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }
  
  // Location validation (optional)
  if (row.location && typeof row.location === 'string' && row.location.length > 100) {
    errors.push('Location must be less than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// File validation functions
export const validateCsvFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
    return { isValid: false, error: 'Please upload a valid CSV file' };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File cannot be empty' };
  }
  
  return { isValid: true };
};

// General validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};