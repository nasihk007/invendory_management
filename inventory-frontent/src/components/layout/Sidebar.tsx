import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Bell, 
  BarChart3, 
  Settings,
  Users,
  X 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/common/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktop: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDesktop }) => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    ...(user?.role === 'manager' ? [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Staff Management', href: '/staff', icon: Users },
      { name: 'Bulk Operations', href: '/bulk-operations', icon: Settings },
    ] : []),
  ];

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  // On desktop, always show sidebar; on mobile, show only when open
  const shouldShowSidebar = isDesktop || isOpen;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={isDesktop ? 'open' : (isOpen ? 'open' : 'closed')}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`w-64 bg-white shadow-lg ${
          isDesktop 
            ? 'fixed inset-y-0 left-0 z-30' 
            : 'fixed inset-y-0 left-0 z-50'
        }`}
      >
        {!isDesktop && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              icon={<X className="w-4 h-4" />}
            >
              Close
            </Button>
          </div>
        )}

        {isDesktop && (
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Management</h2>
          </div>
        )}

        <nav className="mt-4 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;