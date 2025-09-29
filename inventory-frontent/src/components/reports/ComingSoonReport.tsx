import React from 'react';
import { motion } from 'framer-motion';
import { Construction, ArrowLeft } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

interface ComingSoonReportProps {
  reportName: string;
  onBack: () => void;
}

const ComingSoonReport: React.FC<ComingSoonReportProps> = ({ reportName, onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-4"
      >
        <Button
          variant="outline"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Reports
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{reportName}</h1>
          <p className="text-gray-600">This report is currently under development</p>
        </div>
      </motion.div>

      {/* Coming Soon Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="text-center py-16">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6"
          >
            <Construction className="w-12 h-12 text-yellow-600" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Coming Soon!
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            We're working hard to bring you the <strong>{reportName}</strong>. 
            This feature is currently under development and will be available soon.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              What's Coming
            </h3>
            <ul className="text-left text-blue-800 space-y-2 max-w-md mx-auto">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Comprehensive analytics and insights
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Interactive charts and visualizations
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Export functionality for data analysis
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Customizable filters and date ranges
              </li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <Button variant="primary" onClick={onBack}>
              Back to Available Reports
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Available Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-900">Low Stock Alerts</p>
                <p className="text-sm text-green-700">Available now</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-900">Inventory Valuation</p>
                <p className="text-sm text-green-700">Available now</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">⏳</span>
              </div>
              <div>
                <p className="font-medium text-yellow-900">Sales Performance</p>
                <p className="text-sm text-yellow-700">Coming soon</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">⏳</span>
              </div>
              <div>
                <p className="font-medium text-yellow-900">User Activity</p>
                <p className="text-sm text-yellow-700">Coming soon</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ComingSoonReport;
