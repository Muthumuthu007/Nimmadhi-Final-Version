import React from 'react';
import { X, Package, DollarSign, Clock, ArrowUpRight, ArrowDownRight, Boxes, AlertTriangle } from 'lucide-react';
import { Product } from '../../types';
import { format } from 'date-fns';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  // Helper function to safely format numbers
  const formatCurrency = (value: any): string => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle ESC key press
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Prevent body scrolling when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="relative min-h-screen flex items-center justify-center py-8">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b z-10 px-6 py-4 rounded-t-xl">
            <div className="flex justify-between items-start">
              <div className="pr-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center flex-wrap gap-2">
                  {product.name}
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    ID: {product.id}
                  </span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {format(new Date(product.createdAt), 'PPp')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="Press ESC to close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-blue-700 font-medium">Current Stock</h3>
                  <Boxes className="h-5 w-5 text-blue-700" />
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-2">{product.inventory} units</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-green-700 font-medium">Max Production</h3>
                  <ArrowUpRight className="h-5 w-5 text-green-700" />
                </div>
                <p className="text-2xl font-bold text-green-900 mt-2">{product.maxProduce} units</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-purple-700 font-medium">Production Cost</h3>
                  <DollarSign className="h-5 w-5 text-purple-700" />
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-2">₹{formatCurrency(product.productionCostTotal)}</p>
              </div>
            </div>

            {/* Production Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Production Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-600">Max Production</span>
                    <span className="font-semibold text-indigo-600">{product.maxProduce} units</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-600">Original Max</span>
                    <span className="font-semibold text-indigo-600">{product.originalMaxProduce} units</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-600">Current Inventory</span>
                    <span className="font-semibold text-indigo-600">{product.inventory} units</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Total Production Cost</span>
                      <span className="text-xl font-bold text-green-700">₹{formatCurrency(product.productionCostTotal)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                    {Object.entries(product.productionCostBreakdown).map(([material, cost]) => (
                      <div key={material} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-gray-600 break-words pr-4">{material}</span>
                        <span className="font-medium text-gray-900 whitespace-nowrap">₹{formatCurrency(cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Required Materials */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Package className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Required Materials</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {Object.entries(product.stockNeeded).map(([material, quantity]) => (
                  <div key={material} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900 mb-2 break-words">{material}</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Required:</span>
                      <span className="font-semibold text-indigo-600">{quantity} units</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-xl">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};