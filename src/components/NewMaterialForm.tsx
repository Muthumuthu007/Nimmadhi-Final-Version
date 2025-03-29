import React, { useState } from 'react';
import axios from 'axios';
import { RawMaterial } from '../types';
import { generateMaterialId } from '../utils/inventory';
import { AlertCircle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';

interface NewMaterialFormProps {
  inventory: RawMaterial[];
  onAddMaterial: (material: RawMaterial) => void;
  onClose: () => void;
}

export const NewMaterialForm: React.FC<NewMaterialFormProps> = ({
  inventory,
  onAddMaterial,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [material, setMaterial] = useState({
    name: '',
    quantity: '',
    defective: '',
    cost_per_unit: '',
    stock_limit: '',
    unit: '',
    username: 'Muthu' // This should ideally come from your auth context
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a new material object from the form data
      const newMaterial: RawMaterial = {
        id: generateMaterialId(inventory),
        name: material.name,
        quantity: parseFloat(material.quantity) || 0,
        unit: material.unit,
        cost: parseFloat(material.cost_per_unit) || 0,
        available: parseFloat(material.quantity) || 0,
        minStockLimit: parseFloat(material.stock_limit) || 0,
        defectiveQuantity: parseFloat(material.defective) || 0
      };

      await onAddMaterial(newMaterial);
      setSuccess(`Material '${material.name}' added successfully!`);
      
      // Reset form
      setMaterial({
        name: '',
        quantity: '',
        defective: '',
        cost_per_unit: '',
        stock_limit: '',
        unit: '',
        username: 'Muthu'
      });
      
      // Close after a delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to add material. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ${isMaximized ? 'p-0' : 'p-4'}`}>
      <div 
        className={`bg-white rounded-lg overflow-hidden flex flex-col transition-all duration-300 
          ${isMaximized 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : 'w-full max-w-md max-h-[90vh] overflow-y-auto'
          }`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Add New Raw Material</h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="material-name" className="block text-sm font-medium text-gray-700">Material Name</label>
                <input
                  id="material-name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.name}
                  onChange={e => setMaterial(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="material-unit" className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  id="material-unit"
                  type="text"
                  required
                  placeholder="e.g., kg, mtr, pc"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.unit}
                  onChange={e => setMaterial(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="material-quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  id="material-quantity"
                  type="number"
                  required
                  step="any"
                  min="0"
                  placeholder="Enter quantity"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.quantity}
                  onChange={e => setMaterial(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="material-defective" className="block text-sm font-medium text-gray-700">Defective Quantity</label>
                <input
                  id="material-defective"
                  type="number"
                  required
                  step="any"
                  min="0"
                  placeholder="Enter defective quantity"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.defective}
                  onChange={e => setMaterial(prev => ({ ...prev, defective: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="material-cost" className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                <input
                  id="material-cost"
                  type="number"
                  required
                  step="any"
                  min="0"
                  placeholder="Enter cost per unit"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.cost_per_unit}
                  onChange={e => setMaterial(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="material-limit" className="block text-sm font-medium text-gray-700">Stock Limit</label>
                <input
                  id="material-limit"
                  type="number"
                  required
                  step="any"
                  min="0"
                  placeholder="Enter stock limit"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={material.stock_limit}
                  onChange={e => setMaterial(prev => ({ ...prev, stock_limit: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};