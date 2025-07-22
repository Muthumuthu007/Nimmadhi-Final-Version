import React, { useState, useRef, useEffect } from 'react';
import { RawMaterial } from '../types';
import { makeApiRequest } from '../utils/api';
import { AlertCircle, CheckCircle, Search, ChevronDown, ChevronUp, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Define Product interface since it's not exported from types
interface Product {
  id: string;
  name: string;
  materials: Array<{ materialName: string; quantity: number }>;
  maxProduce: number;
  productionCostBreakdown: Record<string, number>;
  productionCostTotal: number;
  inventory: number;
  originalMaxProduce: number;
  stockNeeded: { [key: string]: string };
  createdAt: string;
}

interface NewProductFormProps {
  inventory: RawMaterial[];
  onAddProduct: (product: Product) => void;
  onClose: () => void;
}

export const NewProductForm: React.FC<NewProductFormProps> = ({
  inventory,
  onAddProduct,
  onClose
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    materials: [] as Array<{ materialName: string; quantity: string }>,
    wastage_percent: '',
    transport_cost: '',
    labour_cost: '',
    other_cost: ''
  });
  
  // State for each material dropdown
  const [materialSearches, setMaterialSearches] = useState<string[]>([]);
  const [dropdownStates, setDropdownStates] = useState<boolean[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch available materials from API
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
          defectiveQuantity: item.defective
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

  // Filter materials based on search
  const getFilteredMaterials = (index: number) => {
    const searchTerm = materialSearches[index]?.toLowerCase() || '';
    return availableMaterials.filter(material => 
      material.name.toLowerCase().includes(searchTerm)
    );
  };

  // Update state arrays when materials change
  useEffect(() => {
    if (product.materials.length !== materialSearches.length) {
      setMaterialSearches(Array(product.materials.length).fill(''));
      setDropdownStates(Array(product.materials.length).fill(false));
      dropdownRefs.current = dropdownRefs.current.slice(0, product.materials.length);
    }
  }, [product.materials.length]);
  
  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      dropdownRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node) && dropdownStates[index]) {
          setDropdownStates(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
          });
        }
      });
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownStates]);

  const handleAddMaterial = async () => {
    const newIndex = product.materials.length;
    setProduct(prev => ({
      ...prev,
      materials: [...prev.materials, { materialName: '', quantity: '' }]
    }));
    
    // Fetch materials if not already loaded
    if (availableMaterials.length === 0) {
      await fetchAvailableMaterials();
    }
    
    // Open dropdown for the new material
    setDropdownStates(prev => {
      const newState = [...prev];
      newState[newIndex] = true;
      return newState;
    });
    
    // Initialize search for the new material
    setMaterialSearches(prev => {
      const newSearches = [...prev];
      newSearches[newIndex] = '';
      return newSearches;
    });
  };

  // Handle dropdown toggle
  const toggleDropdown = (index: number) => {
    setDropdownStates(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  // Handle search input change
  const handleSearchChange = (value: string, index: number) => {
    setMaterialSearches(prev => {
      const newSearches = [...prev];
      newSearches[index] = value;
      return newSearches;
    });
  };

  // Handle material selection
  const selectMaterial = (material: RawMaterial, index: number) => {
    try {
      const newMaterials = [...product.materials];
      newMaterials[index].materialName = material.name;
      setProduct(prev => ({ ...prev, materials: newMaterials }));
      
      // Close dropdown and reset search
      setDropdownStates(prev => {
        const newState = [...prev];
        newState[index] = false;
        return newState;
      });
      setMaterialSearches(prev => {
        const newSearches = [...prev];
        newSearches[index] = '';
        return newSearches;
      });
    } catch (error) {
      console.error('Error selecting material:', error);
      setError('Failed to select material. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const stockNeeded: { [key: string]: string } = {};
      product.materials.forEach(({ materialName, quantity }) => {
        if (materialName && quantity) {
          const numQuantity = Number(quantity);
          if (!isNaN(numQuantity) && numQuantity > 0) {
            stockNeeded[materialName] = numQuantity.toString();
          } else {
            setError(`Invalid quantity for material: ${materialName}. Must be a positive number.`);
            return; // Stop processing if any quantity is invalid
          }
        }
      });

      if (Object.keys(stockNeeded).length === 0) {
        setError('No valid materials selected or quantities entered.');
        return;
      }

      const response = await makeApiRequest({
        operation: "CreateProduct",
        product_name: product.name,
        stock_needed: stockNeeded,
        username: user.username,
        wastage_percent: product.wastage_percent,
        transport_cost: product.transport_cost,
        labour_cost: product.labour_cost,
        other_cost: product.other_cost
      });

      if (response?.message === "Product created successfully") {
        const newProduct: Product = {
          id: response.product_id,
          name: product.name,
          materials: product.materials.map(mat => ({
            materialName: mat.materialName,
            quantity: Number(mat.quantity)
          })),
          maxProduce: 0, // This will be calculated by the backend
          productionCostBreakdown: {},
          productionCostTotal: response.production_cost_total,
          inventory: 0,
          originalMaxProduce: 0,
          stockNeeded: stockNeeded,
          createdAt: new Date().toISOString()
        };

        onAddProduct(newProduct);
        setSuccess(`Product '${product.name}' created successfully!`);
        setProduct({
          name: '',
          materials: [],
          wastage_percent: '',
          transport_cost: '',
          labour_cost: '',
          other_cost: ''
        });
        
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('Product Not Created');
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to create product. Please try again.');
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
            : 'w-full max-w-2xl max-h-[90vh] overflow-y-auto'
          }`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Create New Product</h2>
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
            <div>
              <label htmlFor="product-name" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                id="product-name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={product.name}
                onChange={e => setProduct(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="wastage-percent" className="block text-sm font-medium text-gray-700">Wastage Percent</label>
                <input
                  id="wastage-percent"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={product.wastage_percent}
                  onChange={e => setProduct(prev => ({ ...prev, wastage_percent: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="transport-cost" className="block text-sm font-medium text-gray-700">Transport Cost</label>
                <input
                  id="transport-cost"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={product.transport_cost}
                  onChange={e => setProduct(prev => ({ ...prev, transport_cost: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="labour-cost" className="block text-sm font-medium text-gray-700">Labour Cost</label>
                <input
                  id="labour-cost"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={product.labour_cost}
                  onChange={e => setProduct(prev => ({ ...prev, labour_cost: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="other-cost" className="block text-sm font-medium text-gray-700">Other Cost</label>
                <input
                  id="other-cost"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={product.other_cost}
                  onChange={e => setProduct(prev => ({ ...prev, other_cost: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-lg font-medium">Materials Required</h3>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Material
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {product.materials.map((material, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Material {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(prev => ({
                            ...prev,
                            materials: prev.materials.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative" ref={el => dropdownRefs.current[index] = el}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Material
                        </label>
                        <button
                          type="button"
                          className="flex justify-between items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-left focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          onClick={() => toggleDropdown(index)}
                        >
                          <span>{material.materialName || 'Select Material'}</span>
                          {dropdownStates[index] ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        
                        {dropdownStates[index] && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Search materials..."
                                  value={materialSearches[index] || ''}
                                  onChange={(e) => handleSearchChange(e.target.value, index)}
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {isLoadingMaterials ? (
                                <div className="p-4 text-center text-gray-500">
                                  <Loader2 className="animate-spin h-5 w-5 mx-auto mb-2" />
                                  Loading materials...
                                </div>
                              ) : getFilteredMaterials(index).length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                  No materials found
                                </div>
                              ) : (
                                getFilteredMaterials(index).map((material) => (
                                <button
                                    key={material.id}
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                                  onClick={() => selectMaterial(material, index)}
                                >
                                    <div className="flex justify-between items-center">
                                      <span>{material.name}</span>
                                      <span className="text-xs text-gray-500">
                                        Available: {material.available} {material.unit}
                                      </span>
                                    </div>
                                </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Quantity"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          value={material.quantity || ''}
                          onChange={e => {
                            const newMaterials = [...product.materials];
                            newMaterials[index].quantity = e.target.value;
                            setProduct(prev => ({ ...prev, materials: newMaterials }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Creating...
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};