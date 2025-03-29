import React, { useState, useEffect } from 'react';
import { Product, ProductionResponse } from '../types';
import { makeApiRequest } from '../utils/api';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
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
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastProduction, setLastProduction] = useState<ProductionResponse | null>(null);
  const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);

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

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await makeApiRequest({
        operation: "PushToProduction",
        product_id: selectedProduct,
        quantity: quantity,
        username: user.username
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

      {lastProduction && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-md">
          <h3 className="font-medium text-indigo-800 mb-2">Last Production Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Product ID:</span> {lastProduction.product_id}</p>
            <p><span className="font-medium">Quantity:</span> {lastProduction.quantity_produced} units</p>
            <p><span className="font-medium">Cost per Unit:</span> ₹{lastProduction.production_cost_per_unit.toFixed(2)}</p>
            <p><span className="font-medium">Total Cost:</span> ₹{lastProduction.total_production_cost.toFixed(2)}</p>
            <p><span className="font-medium">Push ID:</span> {lastProduction.push_id}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Product</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            required
          >
            <option value="">Choose a product...</option>
            {products.map((product) => (
              <option 
                key={product.id} 
                value={product.id}
                disabled={product.maxProduce === 0}
              >
                {product.name} {product.maxProduce === 0 ? '(Insufficient materials)' : ''}
              </option>
            ))}
          </select>
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
                <span className="font-medium">₹{selectedProductDetails.productionCostTotal}</span>
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
            type="number"
            min="1"
            max={selectedProductDetails?.maxProduce || 1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        {selectedProductDetails && (
          <div className="bg-indigo-50 p-4 rounded-md">
            <h3 className="font-medium text-indigo-700 mb-2">Production Summary</h3>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span>Total Production Cost:</span>
                <span className="font-medium">₹{(selectedProductDetails.productionCostTotal * quantity).toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Total Materials Required:</span>
                <span className="font-medium">
                  {Object.entries(selectedProductDetails.stockNeeded)
                    .map(([material, qty]) => `${material}: ${Number(qty) * quantity}`)
                    .join(', ')}
                </span>
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !selectedProduct || quantity < 1 || (selectedProductDetails?.maxProduce || 0) < quantity}
          className={`w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            (isLoading || !selectedProduct || quantity < 1 || (selectedProductDetails?.maxProduce || 0) < quantity) 
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