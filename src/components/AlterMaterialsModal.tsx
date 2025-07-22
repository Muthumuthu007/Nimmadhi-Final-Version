import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Product, RawMaterial } from '../types';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface AlterMaterialsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MaterialEntry {
  materialName: string;
  quantity: number | '';
}

export const AlterMaterialsModal: React.FC<AlterMaterialsModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'delete'>('add');
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Add materials state
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialEntry[]>([]);
  
  // Delete materials state
  const [materialsToDelete, setMaterialsToDelete] = useState<string[]>([]);
  const [deleteSearch, setDeleteSearch] = useState('');

  const [isMaximized, setIsMaximized] = useState(false);

  // Fetch available materials
  useEffect(() => {
    if (isOpen) {
      fetchAvailableMaterials();
    }
  }, [isOpen]);

  const fetchAvailableMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const response = await makeApiRequest({
        operation: "ListInventoryStock"
      });
      
      if (Array.isArray(response)) {
        const formattedMaterials: RawMaterial[] = response.map(item => ({
          id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          cost: item.cost_per_unit,
          available: item.total_quantity,
          minStockLimit: item.stock_limit,
          defectiveQuantity: item.defective,
          created_at: item.created_at || new Date().toISOString()
        }));
        setAvailableMaterials(formattedMaterials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to fetch available materials. Please try again.');
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddMaterial = (material: RawMaterial) => {
    const existingIndex = selectedMaterials.findIndex(m => m.materialName === material.name);
    if (existingIndex >= 0) {
      setSelectedMaterials(prev => prev.map((m, i) => 
        i === existingIndex ? { ...m, quantity: m.quantity + 1 } : m
      ));
    } else {
      setSelectedMaterials(prev => [...prev, { materialName: material.name, quantity: 1 }]);
    }
    setMaterialSearch('');
    setShowMaterialDropdown(false);
  };

  const handleRemoveMaterial = (index: number) => {
    setSelectedMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number | '') => {
    setSelectedMaterials(prev => prev.map((m, i) =>
      i === index ? { ...m, quantity } : m
    ));
  };

  const handleToggleDeleteMaterial = (materialName: string) => {
    setMaterialsToDelete(prev => 
      prev.includes(materialName) 
        ? prev.filter(m => m !== materialName)
        : [...prev, materialName]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let payload: any = {
        operation: "AlterProduct",
        product_id: product.id,
        username: user.username
      };

      if (activeTab === 'add' && selectedMaterials.length > 0) {
        const stockAdd: { [key: string]: number } = {};
        for (const material of selectedMaterials) {
          if (material.quantity === '' || isNaN(Number(material.quantity))) {
            setError('Please enter a valid quantity for all materials.');
            setIsSubmitting(false);
            return;
          }
          stockAdd[material.materialName] = Number(material.quantity);
        }
        payload.stock_add = stockAdd;
      } else if (activeTab === 'delete' && materialsToDelete.length > 0) {
        payload.stock_delete = materialsToDelete;
      } else {
        setError('Please select at least one material to alter.');
        setIsSubmitting(false);
        return;
      }

      const response = await makeApiRequest(payload);
      
      if (response.message && response.message.includes('successfully')) {
        setSuccess('Product materials updated successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(response.message || 'Failed to update product materials.');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAvailableMaterials = availableMaterials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) &&
    !selectedMaterials.some(selected => selected.materialName === material.name)
  );

  const currentProductMaterials = Object.keys(product.stockNeeded);
  const filteredDeleteMaterials = currentProductMaterials.filter(material =>
    material.toLowerCase().includes(deleteSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ${isMaximized ? 'p-0' : 'p-4'}`}
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl flex flex-col transition-all duration-300 ${isMaximized ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-2xl max-h-[90vh] overflow-hidden'}`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Alter Materials</h2>
            <p className="text-sm text-gray-500 mt-1">{product.name}</p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
              aria-label={isMaximized ? 'Minimize' : 'Maximize'}
              title={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add Materials
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'delete'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete Materials
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 overflow-y-auto pb-48 ${isMaximized ? 'max-h-[calc(100vh-180px)]' : activeTab === 'add' ? 'max-h-[80vh]' : 'max-h-[60vh]'}`}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search and Add Materials
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setShowMaterialDropdown(true);
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                  />
                  
                  {showMaterialDropdown && materialSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingMaterials ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Loading materials...
                        </div>
                      ) : filteredAvailableMaterials.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No materials found
                        </div>
                      ) : (
                        filteredAvailableMaterials.map(material => (
                          <button
                            key={material.id}
                            onClick={() => handleAddMaterial(material)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            title={`Add ${material.name} to product`}
                          >
                            <div className="font-medium">{material.name}</div>
                            <div className="text-sm text-gray-500">
                              Available: {material.available} {material.unit} • ₹{material.cost}/unit
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedMaterials.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Materials
                  </label>
                  <div className="space-y-2">
                    {selectedMaterials.map((material, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{material.materialName}</div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={material.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleQuantityChange(index, val === '' ? '' : Math.max(1, Number(val)));
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          title={`Quantity for ${material.materialName}`}
                          placeholder="Qty"
                        />
                        <button
                          onClick={() => handleRemoveMaterial(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title={`Remove ${material.materialName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Current Materials
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search current materials..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={deleteSearch}
                    onChange={(e) => setDeleteSearch(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Materials to Delete
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredDeleteMaterials.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No materials found
                    </div>
                  ) : (
                    filteredDeleteMaterials.map(materialName => (
                      <label key={materialName} className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={materialsToDelete.includes(materialName)}
                          onChange={() => handleToggleDeleteMaterial(materialName)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          title={`Select ${materialName} for deletion`}
                        />
                        <span className="ml-3 text-sm font-medium">{materialName}</span>
                        <span className="ml-auto text-sm text-gray-500">
                          {product.stockNeeded[materialName]} units
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || 
              (activeTab === 'add' && selectedMaterials.length === 0) ||
              (activeTab === 'delete' && materialsToDelete.length === 0)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Updating...
              </>
            ) : (
              'Update Materials'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 