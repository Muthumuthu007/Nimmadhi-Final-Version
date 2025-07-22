import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductionResponse } from '../types';
import { makeApiRequest } from '../utils/api';
import { AlertTriangle, RotateCcw, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

interface ProductionFormProps {
  products: Product[];
  onProductionComplete: () => void;
}

export const ProductionForm: React.FC<ProductionFormProps> = ({ 
  products,
  onProductionComplete
}) => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastProduction, setLastProduction] = useState<ProductionResponse | null>(null);
  const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProduction = localStorage.getItem('lastProduction');
    if (savedProduction) {
      try {
        setLastProduction(JSON.parse(savedProduction));
      } catch (e) {
        console.error('Failed to parse saved production data', e);
        localStorage.removeItem('lastProduction');
      }
    }
  }, []);

  useEffect(() => {
    if (lastProduction) {
      localStorage.setItem('lastProduction', JSON.stringify(lastProduction));
    } else {
      localStorage.removeItem('lastProduction');
    }
  }, [lastProduction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
      setError('Please enter a valid quantity.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newTotalCostPerUnit = (
        Number(selectedProductDetails.productionCostTotal) +
        Number(selectedProductDetails.laborCost || 0) +
        Number(selectedProductDetails.transportCost || 0) +
        Number(selectedProductDetails.wastageAmount || 0) +
        Number((selectedProductDetails as any).otherCost || 0)
      );
      const response = await makeApiRequest({
        operation: "PushToProduction",
        product_id: selectedProduct,
        quantity: Number(quantity),
        username: user.username,
        production_cost_per_unit: newTotalCostPerUnit
      });

      if (response && (response.message === "Production successful" || 
          response.message === "Product pushed to production successfully." || 
          response.status === "success")) {
        
        setLastProduction(response);
        setSuccessMessage(`Successfully produced ${response.quantity_produced} units at a total cost of ₹${response.total_production_cost.toFixed(2)}`);
        onProductionComplete();
      } else {
        setError(response?.message || 'Production failed. Please try again.');
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Production failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!lastProduction || !lastProduction.push_id) {
      setError('No production to undo');
      return;
    }

    setIsUndoing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await makeApiRequest({
        operation: "UndoProduction",
        push_id: lastProduction.push_id,
        username: user.username
      });

      if (response.message === "Production undone successfully" || 
          response.status === "success") {
        setSuccessMessage('Production has been successfully undone');
        setLastProduction(null);
        onProductionComplete();
      } else {
        setError(response.message || 'Failed to undo production. Please try again.');
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to undo production. Please try again.');
    } finally {
      setIsUndoing(false);
      setShowUndoConfirmation(false);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.id && product.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedProductDetails = products.find(p => p.id === selectedProduct);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Start Production</h2>
        <button
          type="button"
          onClick={() => setShowUndoConfirmation(true)}
          disabled={isUndoing || !lastProduction || !lastProduction.push_id}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md 
            ${lastProduction && lastProduction.push_id 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'} 
            transition-colors duration-200`}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {isUndoing ? 'Undoing...' : 'Undo Last Production'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {lastProduction && (() => {
        const lastProduct = products.find(p => p.id === lastProduction.product_id);
        return (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-md">
            <h3 className="font-medium text-indigo-800 mb-2">Last Production Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Product ID:</span> {lastProduction.product_id}</p>
              <p><span className="font-medium">Quantity:</span> {lastProduction.quantity_produced} units</p>
              <p><span className="font-medium">Cost per Unit:</span> ₹{lastProduct ? (
                Number(lastProduct.productionCostTotal) +
                Number(lastProduct.laborCost || 0) +
                Number(lastProduct.transportCost || 0) +
                Number(lastProduct.wastageAmount || 0) +
                Number((lastProduct as any).otherCost || 0)
              ).toFixed(2) : '-'}</p>
              <p><span className="font-medium">Total Cost:</span> ₹{lastProduct ? (
                (
                  Number(lastProduct.productionCostTotal) +
                  Number(lastProduct.laborCost || 0) +
                  Number(lastProduct.transportCost || 0) +
                  Number(lastProduct.wastageAmount || 0) +
                  Number((lastProduct as any).otherCost || 0)
                ) * Number(lastProduction.quantity_produced)
              ).toFixed(2) : '-'}</p>
              <p><span className="font-medium">Push ID:</span> {lastProduction.push_id}</p>
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Product</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex justify-between items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-left focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {selectedProductDetails ? selectedProductDetails.name : 'Choose a product...'}
              </span>
              {isDropdownOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search products"
                      title="Search products"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No products found
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                          product.maxProduce === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (product.maxProduce > 0) {
                            setSelectedProduct(product.id);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }
                        }}
                        disabled={product.maxProduce === 0}
                      >
                        <div className="flex justify-between items-center">
                          <span>{product.name}</span>
                          {product.maxProduce === 0 && (
                            <span className="text-xs text-red-500">(Insufficient materials)</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedProductDetails && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">Product Details</h3>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span>Available to Produce:</span>
                <span className="font-medium">{selectedProductDetails.maxProduce} units</span>
              </p>
              <p className="flex justify-between">
                <span>Cost per Unit:</span>
                <span className="font-medium">₹{(
                  Number(selectedProductDetails.productionCostTotal) +
                  Number(selectedProductDetails.laborCost || 0) +
                  Number(selectedProductDetails.transportCost || 0) +
                  Number(selectedProductDetails.wastageAmount || 0) +
                  Number((selectedProductDetails as any).otherCost || 0)
                ).toFixed(2)}</span>
              </p>
              <div className="pt-2 border-t">
                <p className="text-gray-600 mb-1">Materials Required per Unit:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(selectedProductDetails.stockNeeded).map(([material, quantity]) => (
                    <li key={material}>
                      {material}: {quantity} units
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="text"
            min="1"
            max={selectedProductDetails?.maxProduce || 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        {selectedProductDetails && (
          <div className="bg-indigo-50 p-4 rounded-md">
            <h3 className="font-medium text-indigo-700 mb-2">Production Summary</h3>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-medium">₹{(
                  (Number(selectedProductDetails.productionCostTotal) +
                  Number(selectedProductDetails.laborCost || 0) +
                  Number(selectedProductDetails.transportCost || 0) +
                  Number(selectedProductDetails.wastageAmount || 0) +
                  Number((selectedProductDetails as any).otherCost || 0)) * Number(quantity)
                ).toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Total Materials Required:</span>
                <span className="font-medium">
                  {Object.entries(selectedProductDetails.stockNeeded)
                    .map(([material, qty]) => `${material}: ${Number(qty) * Number(quantity)}`)
                    .join(', ')}
                </span>
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !selectedProduct || Number(quantity) < 1 || (selectedProductDetails?.maxProduce || 0) < Number(quantity)}
          className={`w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            (isLoading || !selectedProduct || Number(quantity) < 1 || (selectedProductDetails?.maxProduce || 0) < Number(quantity)) 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          {isLoading ? 'Processing...' : 'Start Production'}
        </button>
      </form>

      <ConfirmationDialog
        isOpen={showUndoConfirmation}
        title="Undo Production"
        message="Are you sure you want to undo the last production? This action cannot be undone."
        isProcessing={isUndoing}
        confirmText="Undo Production"
        processingText="Undoing Production..."
        onConfirm={handleUndo}
        onCancel={() => setShowUndoConfirmation(false)}
      />
    </div>
  );
};