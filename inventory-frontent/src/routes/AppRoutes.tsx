import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

// Auth Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Main Pages
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Notifications from '@/pages/Notifications';
import Reports from '@/pages/Reports';
import StaffManagement from '@/pages/StaffManagement';
import BulkOperations from '@/pages/BulkOperations';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/auth/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } 
      />
      <Route 
        path="/auth/register" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Register />
        } 
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="notifications" element={<Notifications />} />
        
        {/* Manager Only Routes */}
        <Route 
          path="reports" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="staff" 
          element={
            <ProtectedRoute requiredRole="manager">
              <StaffManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="bulk-operations" 
          element={
            <ProtectedRoute requiredRole="manager">
              <BulkOperations />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;